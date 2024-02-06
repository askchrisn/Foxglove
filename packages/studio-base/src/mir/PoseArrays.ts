// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { t } from "i18next";
import * as _ from "lodash-es";
import * as THREE from "three";

import { toNanoSec } from "@foxglove/rostime";
import { PosesInFrame } from "@foxglove/schemas";
import { SettingsTreeAction, SettingsTreeFields, Topic } from "@foxglove/studio";
import type { RosValue } from "@foxglove/studio-base/players/types";

import { Axis, AXIS_LENGTH } from "../panels/ThreeDeeRender/renderables/Axis";
import { createArrowMarker } from "../panels/ThreeDeeRender/renderables/Poses";
import { RenderableArrow } from "../panels/ThreeDeeRender/renderables/markers/RenderableArrow";
import { RenderableLineStrip } from "../panels/ThreeDeeRender/renderables/markers/RenderableLineStrip";
import type { AnyRendererSubscription, IRenderer } from "../panels/ThreeDeeRender/IRenderer";
import { BaseUserData, Renderable } from "../panels/ThreeDeeRender/Renderable";
import {
  onlyLastByTopicMessage,
  PartialMessage,
  PartialMessageEvent,
  SceneExtension,
} from "../panels/ThreeDeeRender/SceneExtension";
import { SettingsTreeEntry } from "../panels/ThreeDeeRender/SettingsManager";
import { makeRgba, rgbaGradient, rgbaToCssString, stringToRgba } from "../panels/ThreeDeeRender/color";
import { POSES_IN_FRAME_DATATYPES } from "../panels/ThreeDeeRender/foxglove";
import { normalizeHeader, normalizePose, normalizeTime } from "../panels/ThreeDeeRender/normalizeMessages";
import {
  PoseArray,
  POSE_ARRAY_DATATYPES,
  ColorRGBA,
  NAV_PATH_DATATYPES,
  Marker,
  NavPath,
  MarkerType,
  MarkerAction,
  MirRobotStatePath,
  MIR_ROBOT_STATE_PATH_DATATYPES,
  MirTrajectoryPath,
  MIR_TRAJECTORY_PATH_DATATYPES,
  MirRobotState,
  MirTrajectoryPoint
} from "./ros";
import {
  BaseSettings,
  fieldGradient,
  fieldLineWidth,
  fieldScaleVec3,
  fieldSize,
} from "../panels/ThreeDeeRender/settings";
import { topicIsConvertibleToSchema } from "../panels/ThreeDeeRender/topicIsConvertibleToSchema";
import { makePose, Pose } from "../panels/ThreeDeeRender/transforms";

type GradientRgba = [ColorRGBA, ColorRGBA];
type Gradient = [string, string];
type DisplayType = "axis" | "arrow" | "line";

export type LayerSettingsPoseArray = BaseSettings & {
  type: DisplayType;
  axisScale: number;
  arrowScale: [number, number, number];
  lineWidth: number;
  gradient: Gradient;
  trolley: boolean;
};

const DEFAULT_TROLLEY = false;
const DEFAULT_TYPE: DisplayType = "line";
const DEFAULT_AXIS_SCALE = AXIS_LENGTH;
const DEFAULT_ARROW_SCALE: THREE.Vector3Tuple = [1, 0.15, 0.15];
const DEFAULT_LINE_WIDTH = 0.05;
const DEFAULT_GRADIENT: GradientRgba = [
  { r: 0 / 255, g: 255 / 255, b: 0 / 255, a: 1 },
  { r: 0 / 255, g: 255 / 255, b: 0 / 255, a: 1 },
];

const MISMATCHED_FRAME_ID = "MISMATCHED_FRAME_ID";

const TIME_ZERO = { sec: 0, nsec: 0 };
const COLOR_WHITE = { r: 1, g: 1, b: 1, a: 1 };

const DEFAULT_GRADIENT_STR: Gradient = [
  rgbaToCssString(DEFAULT_GRADIENT[0]!),
  rgbaToCssString(DEFAULT_GRADIENT[1]!),
];

const DEFAULT_SETTINGS: LayerSettingsPoseArray = {
  visible: false,
  type: DEFAULT_TYPE,
  axisScale: DEFAULT_AXIS_SCALE,
  arrowScale: DEFAULT_ARROW_SCALE,
  lineWidth: DEFAULT_LINE_WIDTH,
  gradient: DEFAULT_GRADIENT_STR,
  trolley: false,
};

const tempColor1 = makeRgba();
const tempColor2 = makeRgba();
const tempColor3 = makeRgba();

export type PoseArrayUserData = BaseUserData & {
  settings: LayerSettingsPoseArray;
  topic: string;
  poseArrayMessage: PoseArray;
  originalMessage: Record<string, RosValue>;
  axes: Axis[];
  arrows: RenderableArrow[];
  lineStrip?: RenderableLineStrip;
  trolley_axes: Axis[];
  trolley_angles: number[];
  robot_angles: number[];
  trolley_length: number;
};

export class PoseArrayRenderable extends Renderable<PoseArrayUserData> {
  public override dispose(): void {
    this.userData.axes.forEach((axis) => {
      axis.dispose();
    });
    this.userData.arrows.forEach((arrow) => {
      arrow.dispose();
    });
    this.userData.lineStrip?.dispose();
    super.dispose();
  }

  public override details(): Record<string, RosValue> {
    return this.userData.originalMessage;
  }

  public removeArrows(): void {
    for (const arrow of this.userData.arrows) {
      this.remove(arrow);
      arrow.dispose();
    }
    this.userData.arrows.length = 0;
  }

  public removeAxes(): void {
    for (const axis of this.userData.axes) {
      this.remove(axis);
      axis.dispose();
    }
    this.userData.axes.length = 0;
  }

  public removeLineStrip(): void {
    if (this.userData.lineStrip) {
      this.remove(this.userData.lineStrip);
      this.userData.lineStrip.dispose();
      this.userData.lineStrip = undefined;
    }
  }

  public removeTrolley(): void {
    for (const trolley_axes of this.userData.trolley_axes) {
      this.remove(trolley_axes);
      trolley_axes.dispose();
    }
    this.userData.trolley_axes.length = 0;
  }
}

export class PoseArrays extends SceneExtension<PoseArrayRenderable> {
  public static extensionId = "foxglove.PoseArrays";
  public constructor(renderer: IRenderer, name: string = PoseArrays.extensionId) {
    super(name, renderer);
  }

  public override getSubscriptions(): readonly AnyRendererSubscription[] {
    return [
      {
        type: "schema",
        schemaNames: POSE_ARRAY_DATATYPES,
        subscription: { handler: this.#handlePoseArray, filterQueue: onlyLastByTopicMessage },
      },
      {
        type: "schema",
        schemaNames: POSES_IN_FRAME_DATATYPES,
        subscription: { handler: this.#handlePosesInFrame, filterQueue: onlyLastByTopicMessage },
      },
      {
        type: "schema",
        schemaNames: NAV_PATH_DATATYPES,
        subscription: { handler: this.#handleNavPath, filterQueue: onlyLastByTopicMessage },
      },
      {
        type: "schema",
        schemaNames: MIR_ROBOT_STATE_PATH_DATATYPES,
        subscription: { handler: this.#handleMirRobotStatePath, filterQueue: onlyLastByTopicMessage },
      },
      {
        type: "schema",
        schemaNames: MIR_TRAJECTORY_PATH_DATATYPES,
        subscription: { handler: this.#handleMirTrajectoryPath, filterQueue: onlyLastByTopicMessage },
      },
    ];
  }

  public override settingsNodes(): SettingsTreeEntry[] {
    const configTopics = this.renderer.config.topics;
    const handler = this.handleSettingsAction;
    const entries: SettingsTreeEntry[] = [];
    for (const topic of this.renderer.topics ?? []) {
      if (
        !(
          topicIsConvertibleToSchema(topic, POSE_ARRAY_DATATYPES) ||
          topicIsConvertibleToSchema(topic, NAV_PATH_DATATYPES) ||
          topicIsConvertibleToSchema(topic, POSES_IN_FRAME_DATATYPES) ||
          topicIsConvertibleToSchema(topic, MIR_ROBOT_STATE_PATH_DATATYPES) ||
          topicIsConvertibleToSchema(topic, MIR_TRAJECTORY_PATH_DATATYPES)
        )
      ) {
        continue;
      }
      const config = (configTopics[topic.name] ?? {}) as Partial<LayerSettingsPoseArray>;
      const displayType = config.type ?? getDefaultType(topic);
      const { axisScale, lineWidth } = config;
      const arrowScale = config.arrowScale ?? DEFAULT_ARROW_SCALE;
      const gradient = config.gradient ?? DEFAULT_GRADIENT_STR;
      const trolley_bool = config.trolley ?? DEFAULT_TROLLEY;

      const fields: SettingsTreeFields = {
        type: {
          label: t("threeDee:type"),
          input: "select",
          options: [
            { label: t("threeDee:poseDisplayTypeAxis"), value: "axis" },
            { label: t("threeDee:poseDisplayTypeArrow"), value: "arrow" },
            { label: t("threeDee:poseDisplayTypeLine"), value: "line" },
          ],
          value: displayType,
        },
      };
      switch (displayType) {
        case "axis":
          fields["axisScale"] = fieldSize(t("threeDee:scale"), axisScale, DEFAULT_AXIS_SCALE);
          break;
        case "arrow":
          fields["arrowScale"] = fieldScaleVec3(t("threeDee:scale"), arrowScale);
          break;
        case "line":
          fields["lineWidth"] = fieldLineWidth(
            t("threeDee:lineWidth"),
            lineWidth,
            DEFAULT_LINE_WIDTH,
          );
          break;
      }

      // Axis does not currently support gradients. This could possibly be done with tinting
      if (displayType !== "axis") {
        fields["gradient"] = fieldGradient(t("threeDee:gradient"), gradient);
      }

      fields["trolley"] = {
        label: "Using trolley",
        input: "boolean",
        value: trolley_bool,
      };

      entries.push({
        path: ["topics", topic.name],
        node: {
          label: topic.name,
          icon: topicIsConvertibleToSchema(topic, NAV_PATH_DATATYPES) ? "Timeline" : "Flag",
          fields,
          visible: config.visible ?? DEFAULT_SETTINGS.visible,
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
      const settings = this.renderer.config.topics[topicName] as
        | Partial<LayerSettingsPoseArray>
        | undefined;
      const defaultType = { type: getDefaultType(this.renderer.topicsByName?.get(topicName)) };
      this.#updatePoseArrayRenderable(
        renderable,
        renderable.userData.poseArrayMessage,
        renderable.userData.originalMessage,
        renderable.userData.receiveTime,
        { ...DEFAULT_SETTINGS, ...defaultType, ...settings },
      );
    }
  };

  #handleMirTrajectoryPath = (
    messageEvent: PartialMessageEvent<MirTrajectoryPath>,
  ): void => {
    const poseArrayMessage = normalizeMirTrajecoryArray(messageEvent.message);
    const receiveTime = toNanoSec(messageEvent.receiveTime);
    const topic = messageEvent.topic;
    const originalMessage: Record<string, RosValue> = messageEvent.message;

    let renderable = this.renderables.get(topic);
    if (!renderable) {
      // Set the initial settings from default values merged with any user settings
      const userSettings = this.renderer.config.topics[topic] as
        | Partial<LayerSettingsPoseArray>
        | undefined;
      const defaultType = { type: getDefaultType(this.renderer.topicsByName?.get(topic)) };
      const settings = { ...DEFAULT_SETTINGS, ...defaultType, ...userSettings };

      renderable = new PoseArrayRenderable(topic, this.renderer, {
        receiveTime,
        messageTime: toNanoSec(poseArrayMessage.header.stamp),
        frameId: this.renderer.normalizeFrameId(poseArrayMessage.header.frame_id),
        pose: makePose(),
        settingsPath: ["topics", topic],
        settings,
        topic,
        poseArrayMessage,
        originalMessage,
        axes: [],
        arrows: [],
        trolley_angles: [],
        trolley_axes: [],
        robot_angles: [],
        trolley_length: 0,
      });

      this.add(renderable);
      this.renderables.set(topic, renderable);
    }

    this.#updatePoseArrayRenderable(
      renderable,
      poseArrayMessage,
      originalMessage,
      receiveTime,
      renderable.userData.settings,
    );
  };

  #handleMirRobotStatePath = (
    messageEvent: PartialMessageEvent<MirRobotStatePath>,
  ): void => {
    const poseArrayMessage = normalizeMirPoseArray(messageEvent.message);
    const receiveTime = toNanoSec(messageEvent.receiveTime);
    const topic = messageEvent.topic;
    const originalMessage: Record<string, RosValue> = messageEvent.message;

    let renderable = this.renderables.get(topic);
    if (!renderable) {
      // Set the initial settings from default values merged with any user settings
      const userSettings = this.renderer.config.topics[topic] as
        | Partial<LayerSettingsPoseArray>
        | undefined;
      const defaultType = { type: getDefaultType(this.renderer.topicsByName?.get(topic)) };
      const settings = { ...DEFAULT_SETTINGS, ...defaultType, ...userSettings };

      renderable = new PoseArrayRenderable(topic, this.renderer, {
        receiveTime,
        messageTime: toNanoSec(poseArrayMessage.header.stamp),
        frameId: this.renderer.normalizeFrameId(poseArrayMessage.header.frame_id),
        pose: makePose(),
        settingsPath: ["topics", topic],
        settings,
        topic,
        poseArrayMessage,
        originalMessage,
        axes: [],
        arrows: [],
        trolley_angles: [],
        trolley_axes: [],
        robot_angles: [],
        trolley_length: 0,
      });

      this.add(renderable);
      this.renderables.set(topic, renderable);
    }

    if (messageEvent.message.has_trolley === true) {
      // Bla
      renderable.userData.trolley_length = messageEvent.message.robot_to_trolley_dist ?? 0;

      renderable.userData.robot_angles = [];
      messageEvent.message.path?.forEach((_value) => {
        renderable!.userData.robot_angles.push(_value?.pose_theta ?? 0);
      });

      renderable.userData.trolley_angles = [];
      messageEvent.message.path?.forEach((_value) => {
        renderable!.userData.trolley_angles.push(_value?.hook_angle ?? 0);
      });
    }

    this.#updatePoseArrayRenderable(
      renderable,
      poseArrayMessage,
      originalMessage,
      receiveTime,
      renderable.userData.settings,
    );
  };

  #handlePoseArray = (messageEvent: PartialMessageEvent<PoseArray>): void => {
    const poseArrayMessage = normalizePoseArray(messageEvent.message);
    const receiveTime = toNanoSec(messageEvent.receiveTime);
    this.#addPoseArray(messageEvent.topic, poseArrayMessage, messageEvent.message, receiveTime);
  };

  #handleNavPath = (messageEvent: PartialMessageEvent<NavPath>): void => {
    if (!validateNavPath(messageEvent, this.renderer)) {
      return;
    }

    const poseArrayMessage = normalizeNavPathToPoseArray(messageEvent.message);
    const receiveTime = toNanoSec(messageEvent.receiveTime);
    this.#addPoseArray(messageEvent.topic, poseArrayMessage, messageEvent.message, receiveTime);
  };

  #handlePosesInFrame = (messageEvent: PartialMessageEvent<PosesInFrame>): void => {
    const poseArrayMessage = normalizePosesInFrameToPoseArray(messageEvent.message);
    const receiveTime = toNanoSec(messageEvent.receiveTime);
    this.#addPoseArray(messageEvent.topic, poseArrayMessage, messageEvent.message, receiveTime);
  };

  #addPoseArray(
    topic: string,
    poseArrayMessage: PoseArray,
    originalMessage: Record<string, RosValue>,
    receiveTime: bigint,
  ): void {
    let renderable = this.renderables.get(topic);
    if (!renderable) {
      // Set the initial settings from default values merged with any user settings
      const userSettings = this.renderer.config.topics[topic] as
        | Partial<LayerSettingsPoseArray>
        | undefined;
      const defaultType = { type: getDefaultType(this.renderer.topicsByName?.get(topic)) };
      const settings = { ...DEFAULT_SETTINGS, ...defaultType, ...userSettings };

      renderable = new PoseArrayRenderable(topic, this.renderer, {
        receiveTime,
        messageTime: toNanoSec(poseArrayMessage.header.stamp),
        frameId: this.renderer.normalizeFrameId(poseArrayMessage.header.frame_id),
        pose: makePose(),
        settingsPath: ["topics", topic],
        settings,
        topic,
        poseArrayMessage,
        originalMessage,
        axes: [],
        arrows: [],
        trolley_angles: [],
        trolley_axes: [],
        robot_angles: [],
        trolley_length: 0,
      });

      this.add(renderable);
      this.renderables.set(topic, renderable);
    }

    this.#updatePoseArrayRenderable(
      renderable,
      poseArrayMessage,
      originalMessage,
      receiveTime,
      renderable.userData.settings,
    );
  }

  #createTrolleyAxesToMatchPoses(
    renderable: PoseArrayRenderable,
    poseArray: PoseArray,
    topic: string,
  ): void {
    const scale = 0.1 * (1 / AXIS_LENGTH);

    // Update the scale and visibility of existing AxisRenderables as needed
    const existingUpdateCount = Math.min(
      renderable.userData.trolley_axes.length,
      poseArray.poses.length,
    );
    for (let i = 0; i < existingUpdateCount; i++) {
      const axis = renderable.userData.trolley_axes[i]!;
      axis.visible = true;
      axis.scale.set(scale, scale, scale);
    }

    // Create any AxisRenderables as needed
    for (let i = renderable.userData.trolley_axes.length; i < poseArray.poses.length; i++) {
      const axis = new Axis(topic, this.renderer);
      renderable.userData.trolley_axes.push(axis);
      renderable.add(axis);

      // Set the scale for each new axis
      axis.scale.set(scale, scale, scale);
    }

    // Hide any AxisRenderables as needed
    for (let i = poseArray.poses.length; i < renderable.userData.trolley_axes.length; i++) {
      const axis = renderable.userData.trolley_axes[i]!;
      axis.visible = false;
    }
  }

  #createAxesToMatchPoses(
    renderable: PoseArrayRenderable,
    poseArray: PoseArray,
    topic: string,
  ): void {
    const scale = renderable.userData.settings.axisScale * (1 / AXIS_LENGTH);

    // Update the scale and visibility of existing AxisRenderables as needed
    const existingUpdateCount = Math.min(renderable.userData.axes.length, poseArray.poses.length);
    for (let i = 0; i < existingUpdateCount; i++) {
      const axis = renderable.userData.axes[i]!;
      axis.visible = true;
      axis.scale.set(scale, scale, scale);
    }

    // Create any AxisRenderables as needed
    for (let i = renderable.userData.axes.length; i < poseArray.poses.length; i++) {
      const axis = new Axis(topic, this.renderer);
      renderable.userData.axes.push(axis);
      renderable.add(axis);

      // Set the scale for each new axis
      axis.scale.set(scale, scale, scale);
    }

    // Hide any AxisRenderables as needed
    for (let i = poseArray.poses.length; i < renderable.userData.axes.length; i++) {
      const axis = renderable.userData.axes[i]!;
      axis.visible = false;
    }
  }

  #createArrowsToMatchPoses(
    renderable: PoseArrayRenderable,
    poseArray: PoseArray,
    topic: string,
    colorStart: ColorRGBA,
    colorEnd: ColorRGBA,
  ): void {
    // Generate a Marker with the right scale and color
    const createArrowMarkerFromIndex = (i: number): Marker => {
      const color = rgbaGradient(
        tempColor3,
        colorStart,
        colorEnd,
        i / (poseArray.poses.length - 1),
      );
      return createArrowMarker(renderable.userData.settings.arrowScale, color);
    };

    // Update the arrowMarker of existing RenderableArrow as needed
    const existingUpdateCount = Math.min(renderable.userData.arrows.length, poseArray.poses.length);
    for (let i = 0; i < existingUpdateCount; i++) {
      const arrowMarker = createArrowMarkerFromIndex(i);
      const arrow = renderable.userData.arrows[i]!;
      arrow.visible = true;
      arrow.update(arrowMarker, undefined);
    }

    // Create any RenderableArrow as needed
    for (let i = renderable.userData.arrows.length; i < poseArray.poses.length; i++) {
      const arrowMarker = createArrowMarkerFromIndex(i);
      const arrow = new RenderableArrow(topic, arrowMarker, undefined, this.renderer);
      renderable.userData.arrows.push(arrow);
      renderable.add(arrow);
    }

    // Hide any RenderableArrow as needed
    for (let i = poseArray.poses.length; i < renderable.userData.arrows.length; i++) {
      const arrow = renderable.userData.arrows[i]!;
      arrow.visible = false;
    }
  }

  #updatePoseArrayRenderable(
    renderable: PoseArrayRenderable,
    poseArrayMessage: PoseArray,
    originalMessage: Record<string, RosValue>,
    receiveTime: bigint,
    settings: LayerSettingsPoseArray,
  ): void {
    renderable.userData.receiveTime = receiveTime;
    renderable.userData.messageTime = toNanoSec(poseArrayMessage.header.stamp);
    renderable.userData.frameId = this.renderer.normalizeFrameId(poseArrayMessage.header.frame_id);
    renderable.userData.poseArrayMessage = poseArrayMessage;
    renderable.userData.originalMessage = originalMessage;

    const { topic, settings: prevSettings } = renderable.userData;
    const axisOrArrowSettingsChanged =
      settings.trolley !== prevSettings.trolley ||
      settings.type !== prevSettings.type ||
      settings.axisScale !== prevSettings.axisScale ||
      !_.isEqual(settings.arrowScale, prevSettings.arrowScale) ||
      !_.isEqual(settings.gradient, prevSettings.gradient) ||
      (renderable.userData.arrows.length === 0 && renderable.userData.axes.length === 0);

    renderable.userData.settings = settings;

    const colorStart = stringToRgba(tempColor1, settings.gradient[0]);
    const colorEnd = stringToRgba(tempColor2, settings.gradient[1]);

    if (axisOrArrowSettingsChanged) {
      if (renderable.userData.settings.trolley) {
        renderable.removeTrolley();
      }
      switch (renderable.userData.settings.type) {
        case "axis":
          renderable.removeArrows();
          renderable.removeLineStrip();
          break;
        case "arrow":
          renderable.removeAxes();
          renderable.removeLineStrip();
          break;
        case "line":
          {
            renderable.removeArrows();
            renderable.removeAxes();

            const lineStripMarker = createLineStripMarker(
              poseArrayMessage,
              settings.lineWidth,
              colorStart,
              colorEnd,
            );

            // Create a RenderableLineStrip if needed
            if (!renderable.userData.lineStrip) {
              const lineStrip = new RenderableLineStrip(
                topic,
                lineStripMarker,
                undefined,
                this.renderer,
              );
              renderable.userData.lineStrip = lineStrip;
              renderable.add(lineStrip);
            }

            renderable.userData.lineStrip.update(lineStripMarker, undefined);
          }
          break;
      }
    }

    if (settings.trolley) {
      this.#createTrolleyAxesToMatchPoses(renderable, poseArrayMessage, topic);
      for (let i = 0; i < poseArrayMessage.poses.length; i++) {
        setObjectPoseTrolley(
          renderable.userData.trolley_axes[i]!,
          poseArrayMessage.poses[i]!,
          renderable.userData.trolley_length,
          renderable.userData.trolley_angles[i]!,
          renderable.userData.robot_angles[i]!,
        );
      }
    }

    // Update the pose for each pose renderable
    switch (settings.type) {
      case "axis":
        this.#createAxesToMatchPoses(renderable, poseArrayMessage, topic);
        for (let i = 0; i < poseArrayMessage.poses.length; i++) {
          setObjectPose(renderable.userData.axes[i]!, poseArrayMessage.poses[i]!);
        }
        break;
      case "arrow":
        this.#createArrowsToMatchPoses(renderable, poseArrayMessage, topic, colorStart, colorEnd);
        for (let i = 0; i < poseArrayMessage.poses.length; i++) {
          setObjectPose(renderable.userData.arrows[i]!, poseArrayMessage.poses[i]!);
        }
        break;
      case "line": {
        const lineStripMarker = createLineStripMarker(
          poseArrayMessage,
          settings.lineWidth,
          colorStart,
          colorEnd,
        );
        renderable.userData.lineStrip?.update(lineStripMarker, undefined);
        break;
      }
    }
  }
}

function setObjectPoseTrolley(
  object: THREE.Object3D,
  pose: Pose,
  trolley_length: number,
  trolley_angle: number,
  robot_angle: number,
): void {
  const p = pose.position;
  object.position.set(p.x, p.y, p.z);

  object.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), robot_angle + trolley_angle);

  object.translateX(-1 * trolley_length);

  object.updateMatrix();
}

function getDefaultType(topic: Topic | undefined): DisplayType {
  return topic != undefined && NAV_PATH_DATATYPES.has(topic.schemaName) ? "line" : DEFAULT_TYPE;
}

function setObjectPose(object: THREE.Object3D, pose: Pose): void {
  const p = pose.position;
  const q = pose.orientation;
  object.position.set(p.x, p.y, p.z);
  object.quaternion.set(q.x, q.y, q.z, q.w);
  object.updateMatrix();
}

function createLineStripMarker(
  message: PoseArray,
  lineWidth: number,
  colorStart: ColorRGBA,
  colorEnd: ColorRGBA,
): Marker {
  // Create a gradient of colors for the line strip
  const colors: ColorRGBA[] = [];
  for (let i = 0; i < message.poses.length; i++) {
    colors.push(rgbaGradient(makeRgba(), colorStart, colorEnd, i / (message.poses.length - 1)));
  }

  return {
    header: message.header,
    ns: "",
    id: 0,
    type: MarkerType.LINE_STRIP,
    action: MarkerAction.ADD,
    pose: makePose(),
    scale: { x: lineWidth, y: 1, z: 1 },
    color: COLOR_WHITE,
    lifetime: TIME_ZERO,
    frame_locked: true,
    points: message.poses.map((pose) => pose.position),
    colors,
    text: "",
    mesh_resource: "",
    mesh_use_embedded_materials: false,
  };
}

function normalizeMirPoseArray(
  poseArray: PartialMessage<MirRobotStatePath> | undefined,
): PoseArray {
  if (!poseArray) {
    return { header: normalizeHeader(undefined), poses: [] };
  }
  return {
    header: normalizeHeader(poseArray.header),
    poses: poseArray.path?.map((p) => normalizeMirPose(p)) ?? [],
  };
}

function normalizeMirTrajecoryArray(
  poseArray: PartialMessage<MirTrajectoryPath> | undefined,
): PoseArray {
  if (!poseArray) {
    return { header: normalizeHeader(undefined), poses: [] };
  }
  return {
    header: normalizeHeader(poseArray.header),
    poses: poseArray.path?.map((p) => normalizeMirTrajectory(p)) ?? [],
  };
}

function normalizeMirPose(input_pose: PartialMessage<MirRobotState> | undefined): Pose {
  if (!input_pose) {
    return normalizePose(undefined);
  }
  const q1 = new THREE.Quaternion();
  const euler = new THREE.Euler(-1 * (input_pose.velocity_theta ?? 0), 0, input_pose.pose_theta);
  q1.setFromEuler(euler);
  return {
    position: {
      x: input_pose.pose_x ?? 0,
      y: input_pose.pose_y ?? 0,
      z: input_pose.velocity_x ?? 0,
    },
    orientation: q1,
  };
}

function normalizeMirTrajectory(input_pose: PartialMessage<MirTrajectoryPoint> | undefined): Pose {
  if (!input_pose) {
    return normalizePose(undefined);
  }
  const q1 = new THREE.Quaternion();
  const euler = new THREE.Euler(
    -1 * (input_pose.velocity?.angular ?? 0),
    0,
    input_pose.position?.orientation,
  );
  q1.setFromEuler(euler);
  return {
    position: {
      x: input_pose.position?.x ?? 0,
      y: input_pose.position?.y ?? 0,
      z: input_pose.velocity?.linear ?? 0,
    },
    orientation: q1,
  };
}

function normalizePoseArray(poseArray: PartialMessage<PoseArray>): PoseArray {
  return {
    header: normalizeHeader(poseArray.header),
    poses: poseArray.poses?.map((p) => normalizePose(p)) ?? [],
  };
}

function normalizeNavPathToPoseArray(navPath: PartialMessage<NavPath>): PoseArray {
  return {
    header: normalizeHeader(navPath.header),
    poses: navPath.poses?.map((p) => normalizePose(p?.pose)) ?? [],
  };
}

function normalizePosesInFrameToPoseArray(poseArray: PartialMessage<PosesInFrame>): PoseArray {
  return {
    header: { stamp: normalizeTime(poseArray.timestamp), frame_id: poseArray.frame_id ?? "" },
    poses: poseArray.poses?.map(normalizePose) ?? [],
  };
}

function validateNavPath(messageEvent: PartialMessageEvent<NavPath>, renderer: IRenderer): boolean {
  const { topic, message: navPath } = messageEvent;
  if (navPath.poses) {
    const baseFrameId = renderer.normalizeFrameId(navPath.header?.frame_id ?? "");
    for (const pose of navPath.poses) {
      const curFrameId = renderer.normalizeFrameId(pose?.header?.frame_id ?? "");
      if (baseFrameId !== curFrameId) {
        renderer.settings.errors.addToTopic(
          topic,
          MISMATCHED_FRAME_ID,
          `Path frame does not match frames of all poses. "${baseFrameId}" != "${curFrameId}"`,
        );
        return false;
      }
    }
  }
  return true;
}
