import { MirTrajectoryPath, MirRobotStatePath, MirRobotState, MirTrajectoryPoint } from "@foxglove/studio-base/mir/ros";
import { PartialMessage } from "@foxglove/studio-base/panels/ThreeDeeRender/SceneExtension";
import { normalizeHeader, normalizePose } from "@foxglove/studio-base/panels/ThreeDeeRender/normalizeMessages";
import { PoseArray } from "@foxglove/studio-base/panels/ThreeDeeRender/ros";
import { Pose } from "@foxglove/studio-base/panels/ThreeDeeRender/transforms";
import * as THREE from "three";

export function normalizeMirPoseArray(
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

export function normalizeMirTrajecoryArray(
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

export function normalizeMirPose(input_pose: PartialMessage<MirRobotState> | undefined): Pose {
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

export function normalizeMirTrajectory(input_pose: PartialMessage<MirTrajectoryPoint> | undefined): Pose {
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
