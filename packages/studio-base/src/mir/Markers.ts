// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
import earcut from "earcut";

import { t } from "i18next";
import * as _ from "lodash-es";

import { toNanoSec } from "@foxglove/rostime";
import { SettingsTreeAction } from "@foxglove/studio";

import { LayerSettingsMarker, LayerSettingsMarkerNamespace, TopicMarkers } from "../panels/ThreeDeeRender/renderables/TopicMarkers";
import type { AnyRendererSubscription, IRenderer } from "../panels/ThreeDeeRender/IRenderer";
import { SELECTED_ID_VARIABLE } from "../panels/ThreeDeeRender/Renderable";
import { PartialMessage, PartialMessageEvent, SceneExtension } from "../panels/ThreeDeeRender/SceneExtension";
import { SettingsTreeEntry, SettingsTreeNodeWithActionHandler } from "../panels/ThreeDeeRender/SettingsManager";
import {
  normalizeColorRGBA,
  normalizeColorRGBAs,
  normalizeHeader,
  normalizePose,
  normalizeTime,
  normalizeVector3,
  normalizeVector3s,
} from "../panels/ThreeDeeRender/normalizeMessages";
import {
  ColorRGBA,
  Marker,
  MarkerArray,
  MarkerType,
  MARKER_ARRAY_DATATYPES,
  MARKER_DATATYPES,
  MirZoneActionType,
  MIR_NAVIGATION_MAP,
  MIR_NAVIGATION_MAP_DATATYPES,
  MIR_ZONE,
  MIR_ZONE_ACTION,
  Point,
} from "./ros";
import { topicIsConvertibleToSchema } from "../panels/ThreeDeeRender/topicIsConvertibleToSchema";
import { Pose, makePose } from "../panels/ThreeDeeRender/transforms";
import { Header } from "@foxglove/studio-base/types/Messages";

const DEFAULT_SETTINGS: LayerSettingsMarker = {
  visible: false,
  showOutlines: true,
  color: undefined,
  selectedIdVariable: undefined,
  namespaces: {},
};

export class Markers extends SceneExtension<TopicMarkers> {
  public static extensionId = "foxglove.Markers";
  public constructor(renderer: IRenderer, name: string = Markers.extensionId) {
    super(name, renderer);
  }
  public override getSubscriptions(): readonly AnyRendererSubscription[] {
    return [
      {
        type: "schema",
        schemaNames: MIR_NAVIGATION_MAP_DATATYPES,
        subscription: { handler: this.#handleMirNavigationMap },
      },
      {
        type: "schema",
        schemaNames: MARKER_ARRAY_DATATYPES,
        subscription: { handler: this.#handleMarkerArray },
      },
      {
        type: "schema",
        schemaNames: MARKER_DATATYPES,
        subscription: { handler: this.#handleMarker },
      },
    ];
  }

  public override settingsNodes(): SettingsTreeEntry[] {
    const configTopics = this.renderer.config.topics;
    const entries: SettingsTreeEntry[] = [];
    for (const topic of this.renderer.topics ?? []) {
      if (topicIsConvertibleToSchema(topic, MARKER_ARRAY_DATATYPES) || topicIsConvertibleToSchema(topic, MARKER_DATATYPES)) {
        const config = (configTopics[topic.name] ?? {}) as Partial<LayerSettingsMarker>;

        const node: SettingsTreeNodeWithActionHandler = {
          label: topic.name,
          icon: "Shapes",
          order: topic.name.toLocaleLowerCase(),
          fields: {
            color: { label: t("threeDee:color"), input: "rgba", value: config.color },
            showOutlines: {
              label: t("threeDee:showOutline"),
              input: "boolean",
              value: config.showOutlines ?? DEFAULT_SETTINGS.showOutlines,
            },
            selectedIdVariable: {
              label: t("threeDee:selectionVariable"),
              input: "string",
              help: t("threeDee:selectionVariableHelp"),
              value: config.selectedIdVariable,
              placeholder: SELECTED_ID_VARIABLE,
            },
          },
          visible: config.visible ?? DEFAULT_SETTINGS.visible,
          handler: this.handleSettingsAction,
        };

        // Create a list of all the namespaces for this topic
        const topicMarkers = this.renderables.get(topic.name);
        const namespaces = Array.from(topicMarkers?.namespaces.values() ?? []).sort((a, b) => a.namespace.localeCompare(b.namespace));
        if (namespaces.length > 1 || (namespaces.length === 1 && namespaces[0]!.namespace !== "")) {
          node.children = {};
          for (const ns of namespaces) {
            const child: SettingsTreeNodeWithActionHandler = {
              label: ns.namespace !== "" ? ns.namespace : `""`,
              icon: "Shapes",
              visible: ns.settings.visible,
              defaultExpansionState: namespaces.length > 1 ? "collapsed" : "expanded",
              handler: this.#handleSettingsActionNamespace,
            };
            node.children[`ns:${ns.namespace}`] = child;
          }
        }

        entries.push({ path: ["topics", topic.name], node });
      }
      if (MIR_NAVIGATION_MAP_DATATYPES.has(topic.schemaName)) {
        const node: SettingsTreeNodeWithActionHandler = {
          label: topic.name,
          icon: "Shapes",
          order: topic.name.toLocaleLowerCase(),
          fields: {},
          visible: DEFAULT_SETTINGS.visible,
          handler: this.handleSettingsAction,
        };

        // Create a list of all the namespaces for this topic
        const topicMarkers = this.renderables.get(topic.name);
        const namespaces = Array.from(topicMarkers?.namespaces.values() ?? []).sort((a, b) =>
          a.namespace.localeCompare(b.namespace),
        );
        if (namespaces.length > 1 || (namespaces.length === 1 && namespaces[0]!.namespace !== "")) {
          node.children = {};
          for (const ns of namespaces) {
            const child: SettingsTreeNodeWithActionHandler = {
              label: ns.namespace !== "" ? ns.namespace : `""`,
              icon: "Shapes",
              visible: ns.settings.visible,
              defaultExpansionState: namespaces.length > 1 ? "collapsed" : "expanded",
              handler: this.#handleSettingsActionNamespace,
            };
            node.children[`ns:${ns.namespace}`] = child;
          }
        }

        entries.push({ path: ["topics", topic.name], node });
      }
    }
    return entries;
  }

  public override startFrame(
    currentTime: bigint,
    renderFrameId: string,
    fixedFrameId: string,
  ): void {
    // Don't use SceneExtension#startFrame() because our renderables represent one topic each with
    // many markers. Instead, call startFrame on each renderable
    for (const renderable of this.renderables.values()) {
      renderable.startFrame(currentTime, renderFrameId, fixedFrameId);
    }
  }

  public override handleSettingsAction = (action: SettingsTreeAction): void => {
    const path = action.payload.path;
    if (action.action !== "update" || path.length !== 3) {
      return;
    }

    this.saveSetting(path, action.payload.value);

    // Update the TopicMarkers settings
    const topicName = path[1]!;
    const topicMarkers = this.renderables.get(topicName);
    if (topicMarkers) {
      const settings = this.renderer.config.topics[topicName] as
        | Partial<LayerSettingsMarker>
        | undefined;
      topicMarkers.userData.settings = { ...DEFAULT_SETTINGS, ...settings };
      topicMarkers.update();
    }
  };

  #handleSettingsActionNamespace = (action: SettingsTreeAction): void => {
    const path = action.payload.path;
    if (action.action !== "update" || path.length !== 4) {
      return;
    }

    const topicName = path[1]!;
    const namespaceKey = path[2]!;
    const fieldName = path[3]!;
    const namespace = namespaceKey.slice(3); // remove `ns:` prefix

    this.renderer.updateConfig((draft) => {
      // We build the settings tree with paths of the form
      //   ["topics", <topic>, "ns:"<namespace>, "visible"]
      // but the config is stored with paths of the form
      //   ["topics", <topic>, "namespaces", <namespace>, "visible"]
      const actualPath = ["topics", topicName, "namespaces", namespace, fieldName];
      _.set(draft, actualPath, action.payload.value);
    });

    // Update the MarkersNamespace settings
    const renderable = this.renderables.get(topicName);
    if (renderable) {
      const settings = this.renderer.config.topics[topicName] as
        | Partial<LayerSettingsMarker>
        | undefined;
      const ns = renderable.namespaces.get(namespace);
      if (ns) {
        const nsSettings = settings?.namespaces?.[namespace] as
          | Partial<LayerSettingsMarkerNamespace>
          | undefined;
        ns.settings = { ...ns.settings, ...nsSettings };
      }
    }

    // Update the settings sidebar
    this.updateSettingsTree();
  };

  #handleMirNavigationMap = (
    messageEvent: PartialMessageEvent<MIR_NAVIGATION_MAP>,
  ): void => {
    const topic = messageEvent.topic;
    const navMap = messageEvent.message;
    const receiveTime = toNanoSec(messageEvent.receiveTime);

    for (const zonesMsg of navMap.zones ?? []) {
      const marker = normalizeMirZone(zonesMsg as  PartialMessage<MIR_ZONE>, navMap.header);
      this.#addMarker(topic, marker, receiveTime);
      const text_marker = normalizeMirZoneText(zonesMsg as PartialMessage<MIR_ZONE>, navMap.header);
      this.#addMarker(topic, text_marker, receiveTime);
    }
  };

  #handleMarkerArray = (messageEvent: PartialMessageEvent<MarkerArray>): void => {
    const topic = messageEvent.topic;
    const markerArray = messageEvent.message;
    const receiveTime = toNanoSec(messageEvent.receiveTime);

    for (const markerMsg of markerArray.markers ?? []) {
      if (markerMsg) {
        const marker = normalizeMarker(markerMsg);
        this.#addMarker(topic, marker, receiveTime);
      }
    }
  };

  #handleMarker = (messageEvent: PartialMessageEvent<Marker>): void => {
    const topic = messageEvent.topic;
    const marker = normalizeMarker(messageEvent.message);
    const receiveTime = toNanoSec(messageEvent.receiveTime);

    this.#addMarker(topic, marker, receiveTime);
  };

  #addMarker(topic: string, marker: Marker, receiveTime: bigint): void {
    const topicMarkers = this.#getTopicMarkers(topic, marker, receiveTime);
    const prevNsCount = topicMarkers.namespaces.size;
    topicMarkers.addMarkerMessage(marker, receiveTime);

    // If the topic has a new namespace, rebuild the settings node for this topic
    if (prevNsCount !== topicMarkers.namespaces.size) {
      this.updateSettingsTree();
    }
  }

  public addMarkerArray(topic: string, markerArray: Marker[], receiveTime: bigint): void {
    const firstMarker = markerArray[0];
    if (!firstMarker) {
      return;
    }

    const topicMarkers = this.#getTopicMarkers(topic, firstMarker, receiveTime);
    const prevNsCount = topicMarkers.namespaces.size;
    for (const marker of markerArray) {
      topicMarkers.addMarkerMessage(marker, receiveTime);
    }

    // If the topic has a new namespace, rebuild the settings node for this topic
    if (prevNsCount !== topicMarkers.namespaces.size) {
      this.updateSettingsTree();
    }
  }

  #getTopicMarkers(topic: string, marker: Marker, receiveTime: bigint): TopicMarkers {
    let topicMarkers = this.renderables.get(topic);
    if (!topicMarkers) {
      const userSettings = this.renderer.config.topics[topic] as
        | Partial<LayerSettingsMarker>
        | undefined;

      topicMarkers = new TopicMarkers(topic, this.renderer, {
        receiveTime,
        messageTime: toNanoSec(marker.header.stamp),
        frameId: this.renderer.normalizeFrameId(marker.header.frame_id),
        pose: makePose(),
        settingsPath: ["topics", topic],
        topic,
        settings: { ...DEFAULT_SETTINGS, ...userSettings },
      });
      this.renderables.set(topic, topicMarkers);
      this.add(topicMarkers);
    }
    return topicMarkers;
  }
}

function normalizeMarker(marker: PartialMessage<Marker>): Marker {
  return {
    header: normalizeHeader(marker.header),
    ns: marker.ns ?? "",
    id: marker.id ?? 0,
    type: marker.type ?? 0,
    action: marker.action ?? 0,
    pose: normalizePose(marker.pose),
    scale: normalizeVector3(marker.scale),
    color: normalizeColorRGBA(marker.color),
    lifetime: normalizeTime(marker.lifetime),
    frame_locked: marker.frame_locked ?? false,
    points: normalizeVector3s(marker.points),
    colors: normalizeColorRGBAs(marker.colors),
    text: marker.text ?? "",
    mesh_resource: marker.mesh_resource ?? "",
    mesh_use_embedded_materials: marker.mesh_use_embedded_materials ?? false,
  };
}

function normalizeMirZone(
  zone: PartialMessage<MIR_ZONE>,
  header: PartialMessage<Header> | undefined,
): Marker {
  zone.polygon?.push({ x: zone.polygon[0]?.x, y: zone.polygon[0]?.y, z: zone.polygon[0]?.z });
  return {
    header: normalizeHeader(header),
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/restrict-plus-operands
    ns: getMirNameSpace(zone.actions) + zone.name ?? "",
    id: 0,
    type: MarkerType.TRIANGLE_LIST,
    action: 0,
    pose: normalizePose({
      position: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    }),
    scale: normalizeVector3({ x: 0.1, y: 0.1, z: 0.1 }),
    color: normalizeColorRGBA(getMirZoneColor(zone.actions)),
    lifetime: normalizeTime({}),
    frame_locked: false,
    points: normalizeVector3s(getMirTriangles(zone.polygon)),
    colors: normalizeColorRGBAs([]),
    text: "",
    mesh_resource: "",
    mesh_use_embedded_materials: false,
  };
}

function normalizeMirZoneText(
  zone: PartialMessage<MIR_ZONE>,
  header: PartialMessage<Header> | undefined,
): Marker {
  zone.polygon?.push({ x: zone.polygon[0]?.x, y: zone.polygon[0]?.y, z: zone.polygon[0]?.z });
  return {
    header: normalizeHeader(header),
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/restrict-plus-operands
    ns: getMirNameSpace(zone.actions) + zone.name + " text" ?? "",
    id: 0,
    type: 9,
    action: 0,
    pose: normalizePose(getMirTextPose(zone.polygon)),
    scale: normalizeVector3({ x: 0.25, y: 0.25, z: 0.25 }),
    color: normalizeColorRGBA({ r: 0, g: 0, b: 0, a: 1 }),
    lifetime: normalizeTime({}),
    frame_locked: false,
    points: normalizeVector3s([]),
    colors: normalizeColorRGBAs([]),
    text: zone.name ?? "",
    mesh_resource: "",
    mesh_use_embedded_materials: false,
  };
}

function getMirZoneColor(zone_actions: PartialMessage<MIR_ZONE_ACTION[]> | undefined): ColorRGBA {
  let color: ColorRGBA = { r: 0, g: 0, b: 0, a: 0 };
  if (!zone_actions) {
    return color;
  }

  switch (zone_actions[0]?.type) {
    case MirZoneActionType.MAX_SPEED: {
      // Speed zone;
      color = { r: 238 / 255, g: 75 / 255, b: 43 / 255, a: 0.75 };
      break;
    }
    case MirZoneActionType.FLEET_EVACUATION:
    case MirZoneActionType.FLEET_LOCK: {
      // Fleet lock zone;
      color = { r: 173 / 255, g: 216 / 255, b: 230 / 255, a: 0.75 };
      break;
    }
    case MirZoneActionType.PLANNER_LOOK_AHEAD:
    case MirZoneActionType.OBSTACLE_HISTORY_POLICY:
    case MirZoneActionType.PATH_DEVIATION:
    case MirZoneActionType.PATH_TIMEOUT: {
      color = { r: 191 / 255, g: 64 / 255, b: 191 / 255, a: 0.75 };
      break;
    }
    default: {
      //statements;
      break;
    }
  }
  return color;
}

function getMirNameSpace(zone_actions: PartialMessage<MIR_ZONE_ACTION[]> | undefined): string {
  if (!zone_actions) {
    return "";
  }

  let namespace: string = "";
  switch (zone_actions[0]?.type) {
    case MirZoneActionType.MAX_SPEED: {
      // Speed zone;
      namespace = "speed_zone/";
      break;
    }
    case MirZoneActionType.FLEET_EVACUATION:
    case MirZoneActionType.FLEET_LOCK: {
      // Fleet lock zone;
      namespace = "fleet_lock_zone/";
      break;
    }
    case MirZoneActionType.PLANNER_LOOK_AHEAD:
    case MirZoneActionType.OBSTACLE_HISTORY_POLICY:
    case MirZoneActionType.PATH_DEVIATION:
    case MirZoneActionType.PATH_TIMEOUT: {
      namespace = "planner_zone/";
      break;
    }
    default: {
      //statements;
      break;
    }
  }
  return namespace;
}

function getMirTextPose(points: PartialMessage<Point[]> | undefined): Pose {
  if (!points) {
    return { position: { x: 0, y: 0, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } };
  }
  let x: number = 0;
  let y: number = 0;
  points.forEach((value) => {
    x += value?.x ?? 0;
    y += value?.y ?? 0;
  });
  x /= points.length;
  y /= points.length;

  return { position: { x, y, z: 0.25 }, orientation: { x: 0, y: 0, z: 0, w: 1 } };
}

function getMirTriangles(points: PartialMessage<Point[]> | undefined): Point[] {
  if (!points) {
    return [];
  }
  const x: number[] = [];

  points.forEach((value) => {
    x.push(value?.x ?? 0);
    x.push(value?.y ?? 0);
  });

  const triangles: number[] = earcut(x);
  const output: Point[] = [];
  triangles.forEach((value) => {
    output.push(normalizeVector3(points[value]));
  });
  return output;
}
