import { MIR_NAVIGATION_MAP, MIR_ZONE, MIR_ZONE_ACTION, MirZoneActionType } from "@foxglove/studio-base/mir/ros";
import { ColorRGBA, Marker, MarkerType, Point } from "@foxglove/studio-base/panels/ThreeDeeRender/ros";
import { toNanoSec } from "@foxglove/rostime/dist/timeUtils";
import { PartialMessage, PartialMessageEvent } from "@foxglove/studio-base/panels/ThreeDeeRender/SceneExtension";
import { Header } from "@foxglove/studio-base/types/Messages";
import { normalizeColorRGBA, normalizeColorRGBAs, normalizeHeader, normalizePose, normalizeTime, normalizeVector3, normalizeVector3s } from "@foxglove/studio-base/panels/ThreeDeeRender/normalizeMessages";
import { Pose } from "@foxglove/studio-base/panels/ThreeDeeRender/transforms/geometry";
import earcut from "earcut";

export function handleMirNavigationMap(messageEvent: PartialMessageEvent<MIR_NAVIGATION_MAP>,
  addMarker: (topic: string, marker: Marker, receiveTime: bigint) => void): void {
  const topic = messageEvent.topic;
  const navMap = messageEvent.message;
  const receiveTime = toNanoSec(messageEvent.receiveTime);

  for (const zonesMsg of navMap.zones ?? []) {
    const marker = normalizeMirZone(zonesMsg as  PartialMessage<MIR_ZONE>, navMap.header);
    addMarker(topic, marker, receiveTime);
    const text_marker = normalizeMirZoneText(zonesMsg as PartialMessage<MIR_ZONE>, navMap.header);
    addMarker(topic, text_marker, receiveTime);
  }
};

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
