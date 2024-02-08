import * as _ from "lodash-es";
import * as THREE from "three";

import { toNanoSec } from "@foxglove/rostime";
import { SettingsTreeAction, MessageEvent } from "@foxglove/studio";
import {
  createGeometry,
  createInstancePickingMaterial,
  createPickingMaterial,
  DEFAULT_POINT_SETTINGS,
  LayerSettingsPointExtension,
  pointCloudMaterial,
  pointCloudColorEncoding,
  RenderObjectHistory,
  PointsRenderable,
} from "@foxglove/studio-base/panels/ThreeDeeRender/renderables/pointExtensionUtils";
import type { RosObject, RosValue } from "@foxglove/studio-base/players/types";

import { colorHasTransparency, getColorConverter, colorFieldComputedPrefix } from "../panels/ThreeDeeRender/renderables/colorMode";
import type { AnyRendererSubscription, IRenderer } from "../panels/ThreeDeeRender/IRenderer";
import { BaseUserData, Renderable } from "../panels/ThreeDeeRender/Renderable";
import { PartialMessage, PartialMessageEvent, SceneExtension } from "../panels/ThreeDeeRender/SceneExtension";
import { SettingsTreeEntry } from "../panels/ThreeDeeRender/SettingsManager";
import { normalizeHeader } from "../panels/ThreeDeeRender/normalizeMessages";
import {
  POINTCLOUD_DATATYPES as ROS_POINTCLOUD_DATATYPES,
  GridCell,
  GRID_CELLS_DATATYPES,
  CostmapData,
  MIR_COST_MAP_DATATYPE,
  Point,
} from "./ros";
import { makePose } from "../panels/ThreeDeeRender/transforms";

type LayerSettingsPointClouds = LayerSettingsPointExtension & {
  stixelsEnabled: boolean;
  colorFieldComputed: "distance" | undefined;
};

const DEFAULT_SETTINGS = {
  ...DEFAULT_POINT_SETTINGS,
  stixelsEnabled: false,
  colorFieldComputed: undefined,
};

type GridCellHistoryUserData = BaseUserData & {
  settings: LayerSettingsPointClouds;
  topic: string;
  latestOriginalMessage: Record<string, RosValue> | undefined;
  material: THREE.PointsMaterial;
  pickingMaterial: THREE.ShaderMaterial;
  instancePickingMaterial: THREE.ShaderMaterial;
  gridCell?: GridCell;
};

const tempColor = { r: 0, g: 0, b: 0, a: 0 };

type GridCellUserData = BaseUserData & {
  gridCell?: GridCell;
  originalMessage: Record<string, RosValue> | undefined;
};

class GridCellRenderable extends PointsRenderable<GridCellUserData> {
  public override details(): Record<string, RosValue> {
    return this.userData.originalMessage ?? {};
  }

  public override instanceDetails(instanceId: number): Record<string, RosValue> | undefined {
    return undefined;
  }
}

export class GridCellHistoryRenderable extends Renderable<GridCellHistoryUserData> {
  public override pickable = false; // Picking happens on child renderables
  #pointsHistory: RenderObjectHistory<GridCellRenderable>;

  public constructor(topic: string, renderer: IRenderer, userData: GridCellHistoryUserData) {
    super(topic, renderer, userData);

    const isDecay = userData.settings.decayTime > 0;

    const geometry = createGeometry(
      topic,
      isDecay ? THREE.StaticDrawUsage : THREE.DynamicDrawUsage,
    );
    const points = new GridCellRenderable(
      topic,
      {
        receiveTime: -1n, // unused
        messageTime: -1n, // unused
        frameId: "", //unused
        pose: makePose(), //unused
        settingsPath: [], //unused
        settings: { visible: true }, //unused
        topic,
        gridCell: userData.gridCell,
        originalMessage: userData.latestOriginalMessage,
      },
      geometry,
      userData.material,
      userData.pickingMaterial,
      userData.instancePickingMaterial,
    );

    this.#pointsHistory = new RenderObjectHistory({
      initial: {
        messageTime: userData.receiveTime,
        receiveTime: userData.receiveTime,
        renderable: points,
      },
      parentRenderable: this,
      renderer,
    });
    this.add(points);
  }

  public override dispose(): void {
    this.userData.latestOriginalMessage = undefined;
    this.userData.material.dispose();
    this.userData.pickingMaterial.dispose();
    this.userData.instancePickingMaterial.dispose();
    this.#pointsHistory.dispose();
    this.userData.gridCell = undefined;
    super.dispose();
  }

  public updateGridCell(
    this: GridCellHistoryRenderable,
    GridCell: GridCell,
    originalMessage: RosObject | undefined,
    settings: LayerSettingsPointClouds,
    receiveTime: bigint,
  ): void {
    const messageTime = toNanoSec(GridCell.header.stamp);
    this.userData.receiveTime = receiveTime;
    this.userData.messageTime = messageTime;
    this.userData.frameId = this.renderer.normalizeFrameId(GridCell.header.frame_id);
    this.userData.gridCell = GridCell;
    this.userData.latestOriginalMessage = originalMessage;

    const prevSettings = this.userData.settings;
    const prevIsDecay = prevSettings.decayTime > 0;
    this.userData.settings = settings;

    let material = this.userData.material;
    const needsRebuild =
      colorHasTransparency(settings) !== material.transparent ||
      pointCloudColorEncoding(settings) !== pointCloudColorEncoding(prevSettings) ||
      settings.pointShape !== prevSettings.pointShape;

    const pointsHistory = this.#pointsHistory;
    if (needsRebuild) {
      material.dispose();
      material = pointCloudMaterial(settings);
      this.userData.material = material;
      pointsHistory.forEach((entry) => {
        entry.renderable.updateMaterial(material);
      });

    } else {
      material.size = settings.pointSize;
    }

    if (settings.colorField === colorFieldComputedPrefix + "distance") {
      settings.colorFieldComputed = "distance";
    }

    const latestPointsEntry = pointsHistory.latest();
    latestPointsEntry.receiveTime = receiveTime;
    latestPointsEntry.messageTime = messageTime;
    latestPointsEntry.renderable.userData.pose = makePose();
    latestPointsEntry.renderable.userData.originalMessage = originalMessage;

    const pointCount = Math.trunc(GridCell.cells.length);
    const latestPoints = latestPointsEntry.renderable;
    latestPointsEntry.renderable.geometry.resize(pointCount);
    const positionAttribute = latestPoints.geometry.attributes.position!;
    const colorAttribute = latestPoints.geometry.attributes.color!;

    const isDecay = settings.decayTime > 0;
    if (!isDecay && prevIsDecay !== isDecay) {
      latestPointsEntry.renderable.geometry.setUsage(THREE.DynamicDrawUsage);
    }

    // TODO: This doesnt seem to be used; Keep for now
    // const stixelPositionAttribute = latestStixelEntry.renderable.geometry.attributes.position!;
    // const stixelColorAttribute = latestStixelEntry.renderable.geometry.attributes.color!;
    // // Iterate the point cloud data to update position and color attributes

    // TODO: FYI, updatePointCloud passes 2 stixel properties. We may need those as well
    this.#updateGridCellBuffers(GridCell, settings, positionAttribute, colorAttribute);
  }

  public startFrame(currentTime: bigint, renderFrameId: string, fixedFrameId: string): void {
    this.#pointsHistory.updateHistoryFromCurrentTime(currentTime);
    this.#pointsHistory.updatePoses(currentTime, renderFrameId, fixedFrameId);
  }

  #updateGridCellBuffers(
    // pointCloud: PointCloud | PointCloud2,
    // readers: PointCloudFieldReaders,
    // pointCount: number,
    GridCell: GridCell,
    settings: LayerSettingsPointClouds,
    positionAttribute: THREE.BufferAttribute,
    colorAttribute: THREE.BufferAttribute,
    // stixelPositionAttribute: THREE.BufferAttribute,
    // stixelColorAttribute: THREE.BufferAttribute,
  ): void {
    // Update position attribute
    if (GridCell && GridCell.cells) {
      for (let i = 0; i < GridCell.cells.length; i++) {
          positionAttribute.setXYZ(i, GridCell?.cells[i]?.x ?? 0, GridCell?.cells[i]?.y ?? 0, GridCell?.cells[i]?.z ?? 0);
      }
    }

    // Update color attribute
    // TODO: below is a copy paste from updatePointCloudBuffers, need to change it to GridCell, we are ignoring stixels in our approach
    // if (settings.colorMode === "rgba-fields") {
    //   for (let i = 0; i < pointCount; i++) {
    //     const pointOffset = i * pointStep;
    //     const r = redReader(view, pointOffset);
    //     const g = greenReader(view, pointOffset);
    //     const b = blueReader(view, pointOffset);
    //     const a = alphaReader(view, pointOffset);
    //     colorAttribute.setXYZW(i, r, g, b, a);
    //     if (settings.stixelsEnabled) {
    //       stixelColorAttribute.setXYZW(i * 2, r, g, b, a);
    //       stixelColorAttribute.setXYZW(i * 2 + 1, r, g, b, a);
    //     }
    //   }
    // } else {
    //   // Iterate the point cloud data to determine min/max color values (if needed)
    //   this.#minMaxColorValues(
    //     tempMinMaxColor,
    //     packedColorReader,
    //     view,
    //     pointCount,
    //     pointStep,
    //     settings,
    //   );
    //   const [minColorValue, maxColorValue] = tempMinMaxColor;

    //   // Build a method to convert raw color field values to RGBA
    //   const colorConverter = getColorConverter(
    //     settings as typeof settings & { colorMode: typeof settings.colorMode },
    //     minColorValue,
    //     maxColorValue,
    //   );

    //   for (let i = 0; i < pointCount; i++) {
    //     const pointOffset = i * pointStep;
    //     const colorValue = packedColorReader(view, pointOffset);
    //     colorConverter(tempColor, colorValue);
    //     colorAttribute.setXYZW(i, tempColor.r, tempColor.g, tempColor.b, tempColor.a);
    //     if (settings.stixelsEnabled) {
    //       stixelColorAttribute.setXYZW(i * 2, tempColor.r, tempColor.g, tempColor.b, tempColor.a);
    //       stixelColorAttribute.setXYZW(
    //         i * 2 + 1,
    //         tempColor.r,
    //         tempColor.g,
    //         tempColor.b,
    //         tempColor.a,
    //       );
    //     }
    //   }
    // }

    const minColorValue = 0;
    const maxColorValue = 0;

    // const colorConverter = getColorConverter(settings, minColorValue, maxColorValue);

    // Build a method to convert raw color field values to RGBA
    const colorConverter = getColorConverter(settings as typeof settings & { colorMode: "rgba" }, minColorValue, maxColorValue);
    for (let i = 0; i < GridCell.cells.length; i++) {
      colorConverter(tempColor, 0);
      colorAttribute.setXYZW(
        i,
        (tempColor.r * 255) | 0,
        (tempColor.g * 255) | 0,
        (tempColor.b * 255) | 0,
        (tempColor.a * 255) | 0,
      );
    }

    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;

    // TODO: Below was originally in updatePointCloudBuffers, not sure we need it for GridCell; needed for stixels
    // stixelPositionAttribute.needsUpdate = true;
    // stixelColorAttribute.needsUpdate = true;
  }
}

export class GridCells extends SceneExtension<GridCellHistoryRenderable> {
  public static extensionId = "foxglove.GridCells";

  public constructor(renderer: IRenderer, name: string = GridCells.extensionId) {
    super(name, renderer);
  }

  public override getSubscriptions(): readonly AnyRendererSubscription[] {
    return [
      {
        type: "schema",
        schemaNames: GRID_CELLS_DATATYPES,
        subscription: {
          handler: this.#handleGridCells,
          filterQueue: this.#processMessageQueue.bind(this),
        },
      },
      {
        type: "schema",
        schemaNames: MIR_COST_MAP_DATATYPE,
        subscription: {
          handler: this.#handleMirLocalCostmap,
          filterQueue: this.#processMessageQueue.bind(this),
        },
      },
    ];
  }

  #processMessageQueue<T>(msgs: MessageEvent<T>[]): MessageEvent<T>[] {
    if (msgs.length === 0) {
      return msgs;
    }
    const msgsByTopic = _.groupBy(msgs, (msg) => msg.topic);
    const finalQueue: MessageEvent<T>[] = [];
    for (const topic in msgsByTopic) {
      const topicMsgs = msgsByTopic[topic]!;
      const userSettings = this.renderer.config.topics[topic] as
        | Partial<LayerSettingsPointClouds>
        | undefined;
      // if the topic has a decaytime add all messages to queue for topic
      if ((userSettings?.decayTime ?? DEFAULT_SETTINGS.decayTime) > 0) {
        finalQueue.push(...topicMsgs);
        continue;
      }
      const latestMsg = topicMsgs[topicMsgs.length - 1];
      if (latestMsg) {
        finalQueue.push(latestMsg);
      }
    }

    return finalQueue;
  }

  public override settingsNodes(): SettingsTreeEntry[] {
    const configTopics = this.renderer.config.topics;
    const handler = this.handleSettingsAction;
    const entries: SettingsTreeEntry[] = [];
    // TODO: I dont think we need this per the !isPointCloud check below
    // for (const topic of this.renderer.topics ?? []) {
    //   const isPointCloud = topicIsConvertibleToSchema(topic, ALL_POINTCLOUD_DATATYPES);
    //   if (!isPointCloud) {
    //     continue;
    //   }
    //   const config = (configTopics[topic.name] ?? {}) as Partial<LayerSettingsPointClouds>;
    //   const messageFields = this.#fieldsByTopic.get(topic.name) ?? POINT_CLOUD_REQUIRED_FIELDS;
    //   const node: SettingsTreeNodeWithActionHandler = pointSettingsNode(
    //     topic,
    //     messageFields,
    //     config,
    //   );
    //   node.fields!.stixelsEnabled = {
    //     label: "Stixel view",
    //     input: "boolean",
    //     value: config.stixelsEnabled ?? DEFAULT_SETTINGS.stixelsEnabled,
    //   };
    //   node.handler = handler;
    //   node.icon = "Points";
    //   entries.push({ path: ["topics", topic.name], node });
    // }
    return entries;
  }

  public override startFrame(
    currentTime: bigint,
    renderFrameId: string,
    fixedFrameId: string,
  ): void {
    // Do not call super.startFrame() since we handle updatePose() manually.
    // Instead of updating the pose for each Renderable in this.renderables, we
    // update the pose of each THREE.Points object in the pointsHistory of each
    // renderable

    for (const [topic, renderable] of this.renderables) {
      if (!renderable.userData.settings.visible) {
        renderable.removeFromParent();
        renderable.dispose();
        this.renderables.delete(topic);
        continue;
      }
      renderable.startFrame(currentTime, renderFrameId, fixedFrameId);
    }
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
    if (renderable?.userData.gridCell) {
      const prevSettings = this.renderer.config.topics[topicName] as
        | Partial<LayerSettingsPointClouds>
        | undefined;
      const settings = { ...DEFAULT_SETTINGS, ...prevSettings };

      renderable.updateGridCell(
        renderable.userData.gridCell,
        renderable.userData.latestOriginalMessage,
        settings,
        renderable.userData.receiveTime,
      );
    }
  };

  // TODO: WARNING: This method required serious changes. Originates from handlePointCloud with commit scattered in
  #handleGridCells = (messageEvent: PartialMessageEvent<GridCell>): void => {
    const { topic, schemaName } = messageEvent;
    const gridCell = normalizeGridCell(messageEvent.message);
    const receiveTime = toNanoSec(messageEvent.receiveTime);
    const messageTime = toNanoSec(gridCell.header.stamp);
    const frameId = gridCell.header.frame_id

    let renderable = this.renderables.get(topic);
    if (!renderable) {
      // Set the initial settings from default values merged with any user settings
      const userSettings = this.renderer.config.topics[topic] as | Partial<LayerSettingsPointClouds> | undefined;
      const settings = { ...DEFAULT_SETTINGS, ...userSettings };

      // want to avoid setting this if fields didn't update
      if (settings.colorField == undefined) {
        settings.colorMode = "rgb";
        // TODO: No clue what this does or what it is supposed to be
        // settings.rgbByteOrder = "abgr";

        // Update user settings with the newly selected color field
        this.renderer.updateConfig((draft) => {
          const updatedUserSettings = { ...userSettings };
          updatedUserSettings.colorField = settings.colorField;
          updatedUserSettings.colorMode = "flat";
          updatedUserSettings.colorMap = settings.colorMap;
          draft.topics[topic] = updatedUserSettings;
        });
        this.updateSettingsTree();
      }

      const material = pointCloudMaterial(settings);
      const pickingMaterial = createPickingMaterial(settings);
      const instancePickingMaterial = createInstancePickingMaterial(settings);
      const latestOriginalMessage = messageEvent.message as RosObject;

      renderable = new GridCellHistoryRenderable(topic, this.renderer, {
        receiveTime,
        messageTime,
        frameId: frameId,
        pose: makePose(),
        settingsPath: ["topics", topic],
        settings,
        topic,
        gridCell: gridCell,
        latestOriginalMessage: latestOriginalMessage,
        material,
        pickingMaterial,
        instancePickingMaterial,
      });

      this.add(renderable);
      this.renderables.set(topic, renderable);
    }

    renderable.updateGridCell(gridCell, messageEvent.message as RosObject, renderable.userData.settings, receiveTime);
  };

  #handleMirLocalCostmap = (messageEvent: PartialMessageEvent<GridCell>): void => {
    const { topic, schemaName } = messageEvent;
    const costmap_data = normalizeCostmapData(messageEvent.message);
    const receiveTime = toNanoSec(messageEvent.receiveTime);
    const messageTime = toNanoSec(costmap_data.header.stamp);
    const frameId = costmap_data.header.frame_id

    let renderable = this.renderables.get(topic);
    if (!renderable) {
      // Set the initial settings from default values merged with any user settings
      const userSettings = this.renderer.config.topics[topic] as | Partial<LayerSettingsPointClouds> | undefined;
      const settings = { ...DEFAULT_SETTINGS, ...userSettings };

      // want to avoid setting this if fields didn't update
      if (settings.colorField == undefined) {
        settings.colorMode = "rgb";
        // TODO: No clue what this does or what it is supposed to be
        // settings.rgbByteOrder = "abgr";

        // Update user settings with the newly selected color field
        this.renderer.updateConfig((draft) => {
          const updatedUserSettings = { ...userSettings };
          updatedUserSettings.colorField = settings.colorField;
          updatedUserSettings.colorMode = "flat";
          updatedUserSettings.colorMap = settings.colorMap;
          draft.topics[topic] = updatedUserSettings;
        });
        this.updateSettingsTree();
      }

      const material = pointCloudMaterial(settings);
      const pickingMaterial = createPickingMaterial(settings);
      const instancePickingMaterial = createInstancePickingMaterial(settings);
      const latestOriginalMessage = messageEvent.message as RosObject;

      renderable = new GridCellHistoryRenderable(topic, this.renderer, {
        receiveTime,
        messageTime,
        frameId: frameId,
        pose: makePose(),
        settingsPath: ["topics", topic],
        settings,
        topic,
        gridCell: costmap_data,
        latestOriginalMessage: latestOriginalMessage,
        material,
        pickingMaterial,
        instancePickingMaterial,
      });

      this.add(renderable);
      this.renderables.set(topic, renderable);
    }

    renderable.updateGridCell(costmap_data, messageEvent.message as RosObject, renderable.userData.settings, receiveTime);
  };
}

function normalizePoint(msg: PartialMessage<Point> | undefined): Point {
  if (!msg) {
    return { x: 0, y: 0, z: 0 };
  }
  return { x: msg.x ?? 0, y: msg.y ?? 0, z: msg.z ?? 0 };
}

function normalizeGridCell(message: PartialMessage<GridCell>): GridCell {
  return {
    header: normalizeHeader(message.header),
    cell_width: message.cell_width ?? 0,
    cell_height: message.cell_height ?? 0,
    cells: message.cells?.map((p) => normalizePoint(p)) ?? [],
  };
}

function normalizeCostmapData(message: PartialMessage<CostmapData>): GridCell {
  const resolution = message.resolution!;
  const width = message.width!;
  const height = message.height!;
  const offset_x = message.offset_x!;
  const offset_y = message.offset_y!;
  const grid_cells: GridCell = {
    header: normalizeHeader(message.header),
    cell_height: 0.05,
    cell_width: 0.05,
    cells: [],
  };

  for (let y = 0; y < width; y++) {
    const cur_width = width * y;
    for (let x = cur_width; x < height + cur_width; x++) {
      const index = x >>> 2;
      const offset = 6 - (x % 4 << 1);
      const value = message.data![index];
      let value_out = 0;
      if (value == undefined) {
        value_out = (0 >> offset) & 3;
      } else {
        value_out = (value >> offset) & 3;
      }
      if ((value_out & 0xff) === 2) {
        grid_cells.cells.push({
          x: (x - cur_width) * resolution + offset_x,
          y: y * resolution + offset_y,
          z: 0,
        });
      }
    }
  }
  console.log(grid_cells);
  return grid_cells;
}
