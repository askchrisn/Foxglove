// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { LayoutData } from "@foxglove/studio-base/context/CurrentLayoutContext/actions";

/**
 * This is loaded when the user has no layout selected on application launch
 * to avoid presenting the user with a blank layout.
 */
export const defaultLayout: LayoutData = {
  "configById": {
    "3D!18i6zy7": {
      "layers": {
        "845139cb-26bc-40b3-8161-8ab60af4baf5": {
          "visible": false,
          "frameLocked": true,
          "label": "Grid",
          "instanceId": "845139cb-26bc-40b3-8161-8ab60af4baf5",
          "layerId": "foxglove.Grid",
          "size": 100,
          "divisions": 100,
          "lineWidth": 1,
          "color": "#b0becd",
          "position": [
            0,
            0,
            0
          ],
          "rotation": [
            0,
            0,
            0
          ],
          "order": 1,
          "frameId": "map"
        }
      },
      "cameraState": {
        "perspective": false,
        "distance": 58.72652247359984,
        "phi": 72.76295469770004,
        "thetaOffset": 5.852468599869225,
        "targetOffset": [
          12.450242147703845,
          29.376460834400792,
          3.1876247736041716e-15
        ],
        "target": [
          0,
          0,
          0
        ],
        "targetOrientation": [
          0,
          0,
          0,
          1
        ],
        "fovy": 45,
        "near": 0.01,
        "far": 5000
      },
      "followMode": "follow-pose",
      "topicsFilter": "all",
      "followTf": "map",
      "scene": {
        "backgroundColor": "#5f5b5b",
        "transforms": {
          "labelSize": 0.02999999999999997,
          "enablePreloading": false
        },
        "ignoreColladaUpAxis": false,
        "enableStats": false,
        "labelScaleFactor": 1
      },
      "transforms": {
        "frame:camera_floor_left_link": {
          "visible": false
        },
        "frame:camera_floor_left_color_frame": {
          "visible": false
        },
        "frame:camera_floor_left_color_optical_frame": {
          "visible": false
        },
        "frame:camera_floor_left_depth_optical_frame": {
          "visible": false
        },
        "frame:camera_floor_right_link": {
          "visible": false
        },
        "frame:camera_floor_right_color_frame": {
          "visible": false
        },
        "frame:camera_floor_right_color_optical_frame": {
          "visible": false
        },
        "frame:camera_floor_right_depth_optical_frame": {
          "visible": false
        },
        "frame:camera_infra1_frame": {
          "visible": false
        },
        "frame:camera_infra1_optical_frame": {
          "visible": false
        },
        "frame:camera_infra2_frame": {
          "visible": false
        },
        "frame:camera_infra2_optical_frame": {
          "visible": false
        },
        "frame:imu_link": {
          "visible": false
        }
      },
      "topics": {
        "/move_base_node/visualization_marker": {
          "visible": false
        },
        "/one_way_map": {
          "visible": true
        },
        "/map": {
          "visible": true,
          "frameLocked": false
        },
        "/mir_amcl/selected_points": {
          "visible": true,
          "colorField": "x",
          "colorMode": "flat",
          "colorMap": "turbo",
          "pointSize": 5,
          "flatColor": "#78ff7d"
        },
        "/move_base_node/global_plan": {
          "visible": true,
          "lineWidth": 0.02,
          "type": "line",
          "axisScale": 0.1,
          "gradient": [
            "#0fe700",
            "#19e33e"
          ]
        },
        "/move_base_node/plan/local_segment": {
          "visible": true
        },
        "/f_scan": {
          "visible": true,
          "colorField": "intensity",
          "colorMode": "flat",
          "colorMap": "turbo",
          "flatColor": "#ffca00",
          "pointSize": 4
        },
        "/b_scan": {
          "visible": true,
          "colorField": "intensity",
          "colorMode": "flat",
          "colorMap": "turbo",
          "pointSize": 4,
          "pointShape": "circle",
          "flatColor": "#ffd200",
          "gradient": [
            "#11ab2e",
            "#2ab066"
          ],
          "decayTime": 0
        },
        "/move_base_node/local_costmap/robot_footprint": {
          "visible": true,
          "lineWidth": 0.035,
          "color": "#00f500"
        },
        "/move_base_node/visualization_msgs": {
          "visible": false
        },
        "/traffic_map": {
          "visible": true
        },
        "/particlevizmarker": {
          "visible": false
        },
        "/camera_floor/obstacles": {
          "visible": true,
          "colorField": "x",
          "colorMode": "colormap",
          "colorMap": "turbo"
        },
        "/move_base_node/local_costmap/obstacles": {
          "visible": true,
          "pointSize": 8,
          "colorField": "x",
          "colorMode": "flat",
          "colorMap": "turbo",
          "flatColor": "#4646fa"
        }
      },
      "publish": {
        "type": "point",
        "poseTopic": "/move_base_simple/goal",
        "pointTopic": "/clicked_point",
        "poseEstimateTopic": "/initialpose",
        "poseEstimateXDeviation": 0.5,
        "poseEstimateYDeviation": 0.5,
        "poseEstimateThetaDeviation": 0.26179939
      },
      "imageMode": {}
    },
    "DiagnosticStatusPanel!29l1m1b": {
      "topicToRender": "/diagnostics",
      "selectedHardwareId": "PowerBoard"
    },
    "DiagnosticSummary!n2vqhl": {
      "minLevel": 1,
      "pinnedIds": [],
      "hardwareIdFilter": "",
      "topicToRender": "/diagnostics",
      "sortByLevel": true
    }
  },
  "globalVariables": {},
  "userNodes": {},
  "playbackConfig": {
    "speed": 1
  },
  "layout": {
    "first": "3D!18i6zy7",
    "second": {
      "first": "DiagnosticStatusPanel!29l1m1b",
      "second": "DiagnosticSummary!n2vqhl",
      "direction": "column"
    },
    "direction": "row",
    "splitPercentage": 75.48148148148148
  }
} as const;
