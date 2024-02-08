// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import type { Time } from "@foxglove/rostime";

import type { Pose } from "../panels/ThreeDeeRender/transforms/index.js";

// MiR BELOW THIS LINE
//------------------------------------------------------------------------------------------------
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

// MiR ABOVE THIS LINE
//------------------------------------------------------------------------------------------------

export type Matrix3 = [number, number, number, number, number, number, number, number, number];

// prettier-ignore
export type Matrix3x4 = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];

// prettier-ignore
export type Matrix6 = [
  number, number, number, number, number, number,
  number, number, number, number, number, number,
  number, number, number, number, number, number,
  number, number, number, number, number, number,
  number, number, number, number, number, number,
  number, number, number, number, number, number,
];

export enum MarkerType {
  ARROW = 0,
  CUBE = 1,
  SPHERE = 2,
  CYLINDER = 3,
  LINE_STRIP = 4,
  LINE_LIST = 5,
  CUBE_LIST = 6,
  SPHERE_LIST = 7,
  POINTS = 8,
  TEXT_VIEW_FACING = 9,
  MESH_RESOURCE = 10,
  TRIANGLE_LIST = 11,
}

export enum MarkerAction {
  ADD = 0,
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  MODIFY = 0,
  DELETE = 2,
  DELETEALL = 3,
}

export enum PointFieldType {
  UNKNOWN = 0,
  INT8 = 1,
  UINT8 = 2,
  INT16 = 3,
  UINT16 = 4,
  INT32 = 5,
  UINT32 = 6,
  FLOAT32 = 7,
  FLOAT64 = 8,
}

export type RosTime = Time;

export type RosDuration = RosTime;

export type Vector2 = {
  x: number;
  y: number;
};

export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

export type Point = Vector3;
export type Point32 = Vector3;

export type Quaternion = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export type ColorRGB = {
  r: number;
  g: number;
  b: number;
};

export type ColorRGBA = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type PoseWithCovariance = {
  pose: Pose;
  covariance: Matrix6;
};

export type Polygon = {
  points: Point32[];
};

export type Header = {
  frame_id: string;
  stamp: RosTime;
  seq?: number;
};

export type Transform = {
  translation: Vector3;
  rotation: Quaternion;
};

export type TransformStamped = {
  header: Header;
  child_frame_id: string;
  transform: Transform;
};

export type TFMessage = { transforms: TransformStamped[] };

export type Marker = {
  header: Header;
  ns: string;
  id: number;
  type: number;
  action: number;
  pose: Pose;
  scale: Vector3;
  color: ColorRGBA;
  lifetime: RosDuration;
  frame_locked: boolean;
  points: Vector3[];
  colors: ColorRGBA[];
  text: string;
  mesh_resource: string;
  mesh_use_embedded_materials: boolean;
};

export type MarkerArray = {
  markers: Marker[];
};

export type PointField = {
  name: string;
  offset: number;
  datatype: number;
  count: number;
};

export type PointCloud2 = {
  header: Header;
  height: number;
  width: number;
  fields: PointField[];
  is_bigendian: boolean;
  point_step: number;
  row_step: number;
  data: Uint8Array;
  is_dense: boolean;
};

export type LaserScan = {
  header: Header;
  angle_min: number;
  angle_max: number;
  angle_increment: number;
  time_increment: number;
  scan_time: number;
  range_min: number;
  range_max: number;
  ranges: Float32Array;
  intensities: Float32Array;
};

export type MapMetaData = {
  map_load_time: RosTime;
  resolution: number;
  width: number;
  height: number;
  origin: Pose;
};

export type OccupancyGrid = {
  header: Header;
  info: MapMetaData;
  data: Int8Array | number[];
};

export type PoseStamped = {
  header: Header;
  pose: Pose;
};

export type PoseArray = Readonly<{
  header: Header;
  poses: Pose[];
}>;

export type NavPath = Readonly<{
  header: Header;
  poses: PoseStamped[];
}>;

export type PolygonStamped = {
  header: Header;
  polygon: Polygon;
};

export type PoseWithCovarianceStamped = {
  header: Header;
  pose: PoseWithCovariance;
};

export type RegionOfInterest = {
  x_offset: number;
  y_offset: number;
  height: number;
  width: number;
  do_rectify: boolean;
};

export type CameraInfo = {
  header: Header;
  height: number;
  width: number;
  distortion_model: string;
  D: number[];
  K: Matrix3 | [];
  R: Matrix3 | [];
  P: Matrix3x4 | [];
  binning_x: number;
  binning_y: number;
  roi: RegionOfInterest;
};

// The capitalization of the single-letter matrix names is different between
// ROS 1 and ROS 2. This type represents that ambiguity, before normalizing into
// the CameraInfo type
export type IncomingCameraInfo = {
  header: Header;
  height: number;
  width: number;
  distortion_model: string;
  D: number[] | undefined;
  K: Matrix3 | [] | undefined;
  R: Matrix3 | [] | undefined;
  P: Matrix3x4 | [] | undefined;
  d: number[] | undefined;
  k: Matrix3 | [] | undefined;
  r: Matrix3 | [] | undefined;
  p: Matrix3x4 | [] | undefined;
  binning_x: number;
  binning_y: number;
  roi: RegionOfInterest;
};

export type Image = {
  header: Header;
  height: number;
  width: number;
  encoding: string;
  is_bigendian: boolean;
  step: number;
  data: Int8Array | Uint8Array;
};

export type CompressedImage = {
  header: Header;
  format: string;
  data: Uint8Array;
};

export type JointState = {
  header: Header;
  name: string[];
  position: number[];
  velocity: number[];
  effort: number[];
};

export const TIME_ZERO = { sec: 0, nsec: 0 };

export const TRANSFORM_STAMPED_DATATYPES = new Set<string>();
addRosDataType(TRANSFORM_STAMPED_DATATYPES, "geometry_msgs/TransformStamped");

export const TF_DATATYPES = new Set<string>();
addRosDataType(TF_DATATYPES, "tf/tfMessage");
addRosDataType(TF_DATATYPES, "tf2_msgs/TFMessage");

export const MARKER_DATATYPES = new Set<string>();
addRosDataType(MARKER_DATATYPES, "visualization_msgs/Marker");

export const MARKER_ARRAY_DATATYPES = new Set<string>();
addRosDataType(MARKER_ARRAY_DATATYPES, "visualization_msgs/MarkerArray");
// Support the legacy "studio_msgs/MarkerArray" datatype name
addRosDataType(MARKER_ARRAY_DATATYPES, "studio_msgs/MarkerArray");

export const OCCUPANCY_GRID_DATATYPES = new Set<string>();
addRosDataType(OCCUPANCY_GRID_DATATYPES, "nav_msgs/OccupancyGrid");

export const POINTCLOUD_DATATYPES = new Set<string>();
addRosDataType(POINTCLOUD_DATATYPES, "sensor_msgs/PointCloud2");

export const LASERSCAN_DATATYPES = new Set<string>();
addRosDataType(LASERSCAN_DATATYPES, "sensor_msgs/LaserScan");

export const VELODYNE_SCAN_DATATYPES = new Set<string>();
addRosDataType(VELODYNE_SCAN_DATATYPES, "velodyne_msgs/VelodyneScan");

export const POSE_STAMPED_DATATYPES = new Set<string>();
addRosDataType(POSE_STAMPED_DATATYPES, "geometry_msgs/PoseStamped");

export const POSE_WITH_COVARIANCE_STAMPED_DATATYPES = new Set<string>();
addRosDataType(POSE_WITH_COVARIANCE_STAMPED_DATATYPES, "geometry_msgs/PoseWithCovarianceStamped");

export const POSE_ARRAY_DATATYPES = new Set<string>();
addRosDataType(POSE_ARRAY_DATATYPES, "geometry_msgs/PoseArray");

export const NAV_PATH_DATATYPES = new Set<string>();
addRosDataType(NAV_PATH_DATATYPES, "nav_msgs/Path");

export const CAMERA_INFO_DATATYPES = new Set<string>();
addRosDataType(CAMERA_INFO_DATATYPES, "sensor_msgs/CameraInfo");

export const IMAGE_DATATYPES = new Set<string>();
addRosDataType(IMAGE_DATATYPES, "sensor_msgs/Image");

export const COMPRESSED_IMAGE_DATATYPES = new Set<string>();
addRosDataType(COMPRESSED_IMAGE_DATATYPES, "sensor_msgs/CompressedImage");

export const POLYGON_STAMPED_DATATYPES = new Set<string>();
addRosDataType(POLYGON_STAMPED_DATATYPES, "geometry_msgs/PolygonStamped");

export const JOINTSTATE_DATATYPES = new Set<string>();
addRosDataType(JOINTSTATE_DATATYPES, "sensor_msgs/JointState");

export const IMAGE_MARKER_DATATYPES = new Set<string>();
addRosDataType(IMAGE_MARKER_DATATYPES, "visualization_msgs/ImageMarker");

/** Not a real type offered by ROS, but historically Studio has supported it */
export const IMAGE_MARKER_ARRAY_DATATYPES = new Set<string>();
addRosDataType(IMAGE_MARKER_ARRAY_DATATYPES, "visualization_msgs/ImageMarkerArray");

// Expand a single ROS1 dataType into variations for ROS2 and protobufs,
// then add them to the given output set
function addRosDataType(output: Set<string>, dataType: string): Set<string> {
  // Add the ROS1 variation: tf2_msgs/TFMessage
  output.add(dataType);

  // Add the ROS2 variation: tf2_msgs/msg/TFMessage
  const parts = dataType.split("/");
  if (parts.length > 1) {
    const base = parts[0];
    const leaf = parts.slice(1).join("/");
    output.add(`${base}/msg/${leaf}`);
  }

  // Add the protobuf variation: ros.tf2_msgs.TFMessage
  output.add("ros." + dataType.split("/").join("."));

  return output;
}
