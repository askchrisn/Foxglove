// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { t } from "i18next";
import * as THREE from "three";

import { toNanoSec } from "@foxglove/rostime";
import { SettingsTreeAction, SettingsTreeFields } from "@foxglove/studio";
import type { RosValue } from "@foxglove/studio-base/players/types";

import type { AnyRendererSubscription, IRenderer } from "../panels/ThreeDeeRender/IRenderer";
import { BaseUserData, Renderable } from "../panels/ThreeDeeRender/Renderable";
import {
  PartialMessage,
  PartialMessageEvent,
  SceneExtension,
  onlyLastByTopicMessage,
} from "../panels/ThreeDeeRender/SceneExtension";
import { SettingsTreeEntry } from "../panels/ThreeDeeRender/SettingsManager";
import {
  normalizeHeader,
  normalizePose,
  normalizeInt8Array,
  normalizeTime,
} from "../panels/ThreeDeeRender/normalizeMessages";
import { OccupancyGrid, OCCUPANCY_GRID_DATATYPES } from "../panels/ThreeDeeRender/ros";
import { BaseSettings } from "../panels/ThreeDeeRender/settings";
import { topicIsConvertibleToSchema } from "../panels/ThreeDeeRender/topicIsConvertibleToSchema";
import PNG from "png-ts";

export type LayerSettingsOccupancyGrid = BaseSettings & {
  frameLocked: boolean;
};

const INVALID_OCCUPANCY_GRID = "INVALID_OCCUPANCY_GRID";

const DEFAULT_SETTINGS: LayerSettingsOccupancyGrid = {
  visible: false,
  frameLocked: false
};

export type OccupancyGridUserData = BaseUserData & {
  settings: LayerSettingsOccupancyGrid;
  topic: string;
  occupancyGrid: OccupancyGrid;
  mesh: THREE.Mesh;
  texture: THREE.DataTexture;
  material: THREE.MeshBasicMaterial;
  pickingMaterial: THREE.ShaderMaterial;
};

export class OccupancyGridRenderable extends Renderable<OccupancyGridUserData> {
  public override dispose(): void {
    this.userData.texture.dispose();
    this.userData.material.dispose();
    this.userData.pickingMaterial.dispose();
  }

  public override details(): Record<string, RosValue> {
    return this.userData.occupancyGrid;
  }
}

export class OccupancyGrids extends SceneExtension<OccupancyGridRenderable> {
  public static extensionId = "foxglove.OccupancyGrids";
  public constructor(renderer: IRenderer, name: string = OccupancyGrids.extensionId) {
    super(name, renderer);
  }

  public override getSubscriptions(): readonly AnyRendererSubscription[] {
    return [
      {
        type: "schema",
        schemaNames: OCCUPANCY_GRID_DATATYPES,
        subscription: { handler: this.#handleOccupancyGrid, filterQueue: onlyLastByTopicMessage },
      },
    ];
  }

  public override settingsNodes(): SettingsTreeEntry[] {
    const configTopics = this.renderer.config.topics;
    const handler = this.handleSettingsAction;
    const entries: SettingsTreeEntry[] = [];
    for (const topic of this.renderer.topics ?? []) {
      if (!topicIsConvertibleToSchema(topic, OCCUPANCY_GRID_DATATYPES)) {
        continue;
      }

      const configWithDefaults = { ...DEFAULT_SETTINGS, ...configTopics[topic.name] };

      let fields: SettingsTreeFields = {};
      fields.frameLocked = {
        label: t("threeDee:frameLock"),
        input: "boolean",
        value: configWithDefaults.frameLocked ?? false,
      };

      entries.push({
        path: ["topics", topic.name],
        node: {
          label: topic.name,
          icon: "Cells",
          fields,
          visible: configWithDefaults.visible ?? DEFAULT_SETTINGS.visible,
          order: topic.name.toLocaleLowerCase(),
          handler,
        },
      });
    }
    return entries;
  }

  public override handleSettingsAction = (action: SettingsTreeAction): void => {
    const path = action.payload.path;
    if (action.action !== "update" || path.length !== 3) {
      return;
    }

    this.saveSetting(path, action.payload.value);

    // Update the renderable
    const topicName = path[1]!;
    const renderable = this.renderables.get(topicName);
    if (renderable) {
      const prevTransparent = occupancyGridHasTransparency();
      const settings = this.renderer.config.topics[topicName] as
        | Partial<LayerSettingsOccupancyGrid>
        | undefined;
      renderable.userData.settings = { ...DEFAULT_SETTINGS, ...settings };

      // Check if the transparency changed and we need to create a new material
      const newTransparent = occupancyGridHasTransparency();
      if (prevTransparent !== newTransparent) {
        renderable.userData.material.transparent = newTransparent;
        renderable.userData.material.depthWrite = !newTransparent;
        renderable.userData.material.needsUpdate = true;
      }

      this.#updateOccupancyGridRenderable(
        renderable,
        renderable.userData.occupancyGrid,
        renderable.userData.receiveTime,
      );
    }
  };

  #handleOccupancyGrid = (messageEvent: PartialMessageEvent<OccupancyGrid>): void => {
    const topic = messageEvent.topic;
    const occupancyGrid = normalizeOccupancyGrid(messageEvent.message);
    const receiveTime = toNanoSec(messageEvent.receiveTime);

    let renderable = this.renderables.get(topic);
    if (!renderable) {
      // Set the initial settings from default values merged with any user settings
      const userSettings = this.renderer.config.topics[topic] as
        | Partial<LayerSettingsOccupancyGrid>
        | undefined;
      const settings = { ...DEFAULT_SETTINGS, ...userSettings };

      const texture = createTexture(occupancyGrid);
      const geometry = this.renderer.sharedGeometry.getGeometry(
        this.constructor.name,
        createGeometry,
      );
      const mesh = createMesh(topic, geometry, texture); // settings
      const material = mesh.material as THREE.MeshBasicMaterial;
      const pickingMaterial = mesh.userData.pickingMaterial as THREE.ShaderMaterial;

      // Create the renderable
      renderable = new OccupancyGridRenderable(topic, this.renderer, {
        receiveTime,
        messageTime: toNanoSec(occupancyGrid.header.stamp),
        frameId: this.renderer.normalizeFrameId(occupancyGrid.header.frame_id),
        pose: occupancyGrid.info.origin,
        settingsPath: ["topics", topic],
        settings,
        topic,
        occupancyGrid,
        mesh,
        texture,
        material,
        pickingMaterial,
      });
      renderable.add(mesh);

      this.add(renderable);
      this.renderables.set(topic, renderable);
    }

    this.#updateOccupancyGridRenderable(renderable, occupancyGrid, receiveTime);
  };

  #updateOccupancyGridRenderable(
    renderable: OccupancyGridRenderable,
    occupancyGrid: OccupancyGrid,
    receiveTime: bigint,
  ): void {
    renderable.userData.occupancyGrid = occupancyGrid;
    renderable.userData.pose = occupancyGrid.info.origin;
    renderable.userData.receiveTime = receiveTime;
    renderable.userData.messageTime = toNanoSec(occupancyGrid.header.stamp);
    renderable.userData.frameId = this.renderer.normalizeFrameId(occupancyGrid.header.frame_id);

    const png_signature = [-119, 80, 78, 71];
    if (
      occupancyGrid.data[0] == png_signature[0] &&
      occupancyGrid.data[1] == png_signature[1] &&
      occupancyGrid.data[2] == png_signature[2] &&
      occupancyGrid.data[3] == png_signature[3]
    ) {
      const data = new Uint8Array(occupancyGrid.data);
      const pngImage = PNG.load(data);
      const imgData = pngImage.decodePixels();

      const pixels = new Int8Array(imgData.length);

      for (let i = 0; i < pixels.length; i++) {
        pixels[i] = imgData[i]!;
      }
      occupancyGrid.data = pixels;
    }

    const size = occupancyGrid.info.width * occupancyGrid.info.height;
    if (occupancyGrid.data.length !== size) {
      const message = `OccupancyGrid data length (${occupancyGrid.data.length}) is not equal to width ${occupancyGrid.info.width} * height ${occupancyGrid.info.height}`;
      invalidOccupancyGridError(this.renderer, renderable, message);
      return;
    }

    let texture = renderable.userData.texture;
    const width = occupancyGrid.info.width;
    const height = occupancyGrid.info.height;
    const resolution = occupancyGrid.info.resolution;

    if (width !== texture.image.width || height !== texture.image.height) {
      // The image dimensions changed, regenerate the texture
      texture.dispose();
      texture = createTexture(occupancyGrid);
      renderable.userData.texture = texture;
      renderable.userData.material.map = texture;
    }

    // Update the occupancy grid texture
    updateTexture(renderable.userData.topic, texture, occupancyGrid);

    renderable.scale.set(resolution * width, resolution * height, 1);
  }
}
function createGeometry(): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  geometry.translate(0.5, 0.5, 0);
  geometry.computeBoundingSphere();
  return geometry;
}
function invalidOccupancyGridError(
  renderer: IRenderer,
  renderable: OccupancyGridRenderable,
  message: string,
): void {
  renderer.settings.errors.addToTopic(renderable.userData.topic, INVALID_OCCUPANCY_GRID, message);
}

function createTexture(occupancyGrid: OccupancyGrid): THREE.DataTexture {
  const width = occupancyGrid.info.width;
  const height = occupancyGrid.info.height;
  const size = width * height;
  const rgba = new Uint8ClampedArray(size * 4);
  const texture = new THREE.DataTexture(
    rgba,
    width,
    height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType,
    THREE.UVMapping,
    THREE.ClampToEdgeWrapping,
    THREE.ClampToEdgeWrapping,
    THREE.NearestFilter,
    THREE.LinearFilter,
    1,
    THREE.LinearSRGBColorSpace,
  );
  texture.generateMipmaps = false;
  return texture;
}

function createMesh(
  topic: string,
  geometry: THREE.PlaneGeometry,
  texture: THREE.DataTexture,
): THREE.Mesh {
  // Create the texture, material, and mesh
  const pickingMaterial = createPickingMaterial(texture);
  // const material = createMaterial(texture, topic, settings);
  const material = createMaterial(texture, topic);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  // This overrides the picking material used for `mesh`. See Picker.ts
  mesh.userData.pickingMaterial = pickingMaterial;
  return mesh;
}

function updateTexture(
  topic: string,
  texture: THREE.DataTexture,
  occupancyGrid: OccupancyGrid,
): void {
  const size = occupancyGrid.info.width * occupancyGrid.info.height;
  const rgba = texture.image.data;

  const data = occupancyGrid.data;

  switch (topic) {
    case "/traffic_map":
      for (let i = 0; i < size; i++) {
        const value = data[i]! & 0xff;
        const offset = i * 4;
        switch (value) {
          case 0:
            rgba[offset + 0] = 0;
            rgba[offset + 1] = 255;
            rgba[offset + 2] = 0;
            rgba[offset + 3] = 128;
            break;
          case 100:
            rgba[offset + 0] = 0;
            rgba[offset + 1] = 0;
            rgba[offset + 2] = 255;
            rgba[offset + 3] = 128;
            break;
          default:
            rgba[offset + 0] = 0;
            rgba[offset + 1] = 0;
            rgba[offset + 2] = 0;
            rgba[offset + 3] = 0;
            break;
        }
      }
      break;
    case "/one_way_map":
      for (let i = 0; i < size; i++) {
        const value = data[i]! & 0xff;
        const offset = i * 4;
        let red = 0;
        let green = 0;
        let blue = 0;
        let alpha = 128;
        if (value == 255) {
          alpha = 0;
        }
        if ((value & 0b11000111) == 0b11000111) {
          // 0 degrees
          red |= 0b10000000;
        }

        if ((value & 0b10001111) == 0b10001111) {
          // +45 degrees
          green |= 0b01000000;
        }

        if ((value & 0b00011111) == 0b00011111) {
          // +90 degrees
          red |= 0b00100000;
        }

        if ((value & 0b00111110) == 0b00111110) {
          // +135 degrees
          blue |= 0b10000000;
        }

        if ((value & 0b01111100) == 0b01111100) {
          // +/-180 degrees
          green |= 0b00100000;
        }

        if ((value & 0b11111000) == 0b11111000) {
          // -135 degrees
          green |= 0b10000000;
        }

        if ((value & 0b11110001) == 0b11110001) {
          // -90 degrees
          red |= 0b01000000;
        }

        if ((value & 0b11100011) == 0b11100011) {
          // -45 degrees
          blue |= 0b01000000;
        }
        rgba[offset + 0] = red;
        rgba[offset + 1] = green;
        rgba[offset + 2] = blue;
        rgba[offset + 3] = alpha;
      }
      break;
    case "/move_base_node/local_costmap/costmap_data":
      for (let i = 0; i < size; i++) {
        const value = data[i]! & 0xff;
        const offset = i * 4;
        switch (value) {
          case 0:
            // Free
            rgba[offset + 0] = 0;
            rgba[offset + 1] = 0;
            rgba[offset + 2] = 0;
            rgba[offset + 3] = 0;
            break;
          case 1:
            // Obstacle
            rgba[offset + 0] = 0x00;
            rgba[offset + 1] = 0x00;
            rgba[offset + 2] = 0x8b;
            rgba[offset + 3] = 128;
            break;
          case 2:
            // Inflated
            rgba[offset + 0] = 0x39;
            rgba[offset + 1] = 0xff;
            rgba[offset + 2] = 0x14;
            rgba[offset + 3] = 128;
            break;
          default:
            rgba[offset + 0] = 0;
            rgba[offset + 1] = 0;
            rgba[offset + 2] = 0;
            rgba[offset + 3] = 0;
            break;
        }
      }
      break;
    default:
      for (let i = 0; i < size; i++) {
        const value = data[i]! & 0xff;
        const offset = i * 4;
        switch (value) {
          case 0:
            rgba[offset + 0] = 255;
            rgba[offset + 1] = 255;
            rgba[offset + 2] = 255;
            rgba[offset + 3] = 128;
            break;
          case 224:
            rgba[offset + 0] = 0;
            rgba[offset + 1] = 0;
            rgba[offset + 2] = 0;
            rgba[offset + 3] = 128;
            break;
          case 192:
            rgba[offset + 0] = 255;
            rgba[offset + 1] = 168;
            rgba[offset + 2] = 168;
            rgba[offset + 3] = 128;
            break;
          case 96:
            rgba[offset + 0] = 128;
            rgba[offset + 1] = 128;
            rgba[offset + 2] = 128;
            rgba[offset + 3] = 128;
            break;
          case 95:
            rgba[offset + 0] = 255;
            rgba[offset + 1] = 165;
            rgba[offset + 2] = 0;
            rgba[offset + 3] = 128;
            break;
          default:
            rgba[offset + 0] = 0;
            rgba[offset + 1] = 0;
            rgba[offset + 2] = 0;
            rgba[offset + 3] = 0;
            break;
        }
      }
      break;
  }

  texture.needsUpdate = true;
}

function createMaterial(
  texture: THREE.DataTexture,
  topic: string,
): THREE.MeshBasicMaterial {
  const transparent = occupancyGridHasTransparency();
  return new THREE.MeshBasicMaterial({
    name: `${topic}:Material`,
    // Enable alpha clipping. Fully transparent (alpha=0) pixels are skipped
    // even when transparency is disabled
    alphaTest: 1e-4,
    depthWrite: !transparent,
    map: texture,
    side: THREE.DoubleSide,
    transparent,
  });
}

function createPickingMaterial(texture: THREE.DataTexture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform vec4 objectId;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(map, vUv);
        if (color.a == 0.0) {
          discard;
        }
        gl_FragColor = objectId;
      }
    `,
    side: THREE.DoubleSide,
    uniforms: { map: { value: texture }, objectId: { value: [NaN, NaN, NaN, NaN] } },
  });
}

function occupancyGridHasTransparency(): boolean {
  return true;
}

function normalizeOccupancyGrid(message: PartialMessage<OccupancyGrid>): OccupancyGrid {
  const info = message.info ?? {};

  return {
    header: normalizeHeader(message.header),
    info: {
      map_load_time: normalizeTime(info.map_load_time),
      resolution: info.resolution ?? 0,
      width: info.width ?? 0,
      height: info.height ?? 0,
      origin: normalizePose(info.origin),
    },
    data: normalizeInt8Array(message.data),
  };
}
