// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Header, MapMetaData, OccupancyGrid, Point, PointCloud2, PoseWithCovariance, addRosDataType } from "@foxglove/studio-base/panels/ThreeDeeRender/ros";

export enum MirZoneActionType {
  MAX_SPEED = 1,
  PLAY_SOUND = 2,
  DISABLE_3D_CAMERAS = 3,
  DISABLE_LOCALIZATION = 4,
  FLEET_EVACUATION = 5,
  FLEET_LOCK = 6,
  IO_MODULE = 7,
  WARNING_LIGHT = 8,
  PLANNER_LOOK_AHEAD = 9,
  OBSTACLE_HISTORY_POLICY = 10,
  PATH_DEVIATION = 11,
  PATH_TIMEOUT = 12,
  PLC_REGISTER = 13,
}
export type MIR_KEY_VALUE_PAIR = {
  key: string;
  value: string;
};
export type MIR_ZONE_ACTION = {
  type: number;
  parameters: MIR_KEY_VALUE_PAIR[];
};
export type MIR_ZONE = {
  id: string;
  name: string;
  polygon: Point[];
  actions: MIR_ZONE_ACTION[];
};
export type MIR_NAVIGATION_MAP = {
  header: Header;
  metadata: MapMetaData;
  obstacle_map: OccupancyGrid;
  traffic_map: OccupancyGrid;
  one_way_map: OccupancyGrid;
  zones: MIR_ZONE[];
  initial_pose: PoseWithCovariance;
  map_id: string;
  map_checksum: string;
  map_name: string;
};
export type MirObstacleCloud = {
  header: Header;
  cloud: PointCloud2;
  inflation_radius: number;
  cell_width: number;
  cell_height: number;
};
export type MirRobotState = {
  pose_x: number;
  pose_y: number;
  pose_theta: number;
  velocity_x: number;
  velocity_theta: number;
  hook_angle: number;
};
export type MirRobotStatePath = {
  header: Header;
  path: MirRobotState[];
  has_trolley: boolean;
  robot_to_trolley_dist: number;
  current_id: number;
};
export type MirPose2D = {
  x: number;
  y: number;
  orientation: number;
};
export type MirTwist2D = {
  linear: number;
  angular: number;
};
export type MirTrajectoryPoint = {
  position: MirPose2D;
  velocity: MirTwist2D;
};
export type MirTrajectoryPath = {
  header: Header;
  path: MirTrajectoryPoint[];
  index_for_first_cmd_vel: number;
};
export type GridCell = {
  header: Header;
  cell_width: number;
  cell_height: number;
  cells: Point[];
};
export type CostmapData = {
  header: Header;
  height: number;
  width: number;
  resolution: number;
  offset_x: number;
  offset_y: number;
  data: Int8Array | number[];
};
export const GRID_CELLS_DATATYPES = new Set<string>();
addRosDataType(GRID_CELLS_DATATYPES, "nav_msgs/GridCells");
export const MIR_COST_MAP_DATATYPE = new Set<string>();
addRosDataType(MIR_COST_MAP_DATATYPE, "mirMsgs/CostmapData");
export const MIR_OBSTACLE_CLOUD = new Set<string>();
addRosDataType(MIR_OBSTACLE_CLOUD, "mirMsgs/ObstacleCloud");
export const MIR_NAVIGATION_MAP_DATATYPES = new Set<string>();
addRosDataType(MIR_NAVIGATION_MAP_DATATYPES, "mirMsgs/NavigationMap");
export const MIR_ROBOT_STATE_PATH_DATATYPES = new Set<string>();
addRosDataType(MIR_ROBOT_STATE_PATH_DATATYPES, "mirMsgs/robot_state_path");
export const MIR_TRAJECTORY_PATH_DATATYPES = new Set<string>();
addRosDataType(MIR_TRAJECTORY_PATH_DATATYPES, "mirMsgs/TrajectoryPath");
