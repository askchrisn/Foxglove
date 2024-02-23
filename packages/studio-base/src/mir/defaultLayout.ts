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
    "DiagnosticStatusPanel!29l1m1b": {
      "topicToRender": "/diagnostics",
      "selectedHardwareId": "PowerBoard"
    },
    "Plot!42wyo6y": {
      "title": "Some angular stuff",
      "paths": [
        {
          "value": "/imu_data.orientation.z",
          "enabled": true,
          "timestampMethod": "receiveTime"
        },
        {
          "value": "/cmd_vel.twist.angular.z",
          "enabled": true,
          "timestampMethod": "receiveTime"
        },
        {
          "value": "/odom.twist.twist.angular.z",
          "enabled": true,
          "timestampMethod": "receiveTime"
        }
      ],
      "showXAxisLabels": true,
      "showYAxisLabels": true,
      "showLegend": false,
      "legendDisplay": "floating",
      "showPlotValuesInLegend": false,
      "isSynced": true,
      "xAxisVal": "timestamp",
      "sidebarDimension": 240
    },
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
        "distance": 6.470670899427442,
        "phi": 72.76295469770004,
        "thetaOffset": 5.852468599869201,
        "targetOffset": [
          11.8371582814017,
          17.233927045436467,
          3.1859749172215375e-15
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
      }
    },
    "DiagnosticSummary!3aq22na": {
      "minLevel": 1,
      "pinnedIds": [],
      "hardwareIdFilter": "",
      "topicToRender": "/diagnostics",
      "sortByLevel": true
    },
    "RosOut!8ppqb4": {
      "searchTerms": [],
      "minLogLevel": 3
    }
  },
  "globalVariables": {},
  "userNodes": {},
  "playbackConfig": {
    "speed": 1
  },
  "layout": {
    "first": {
      "first": {
        "first": "DiagnosticStatusPanel!29l1m1b",
        "second": "Plot!42wyo6y",
        "direction": "column"
      },
      "second": "3D!18i6zy7",
      "direction": "row",
      "splitPercentage": 21.72066330514832
    },
    "second": {
      "first": "DiagnosticSummary!3aq22na",
      "second": "RosOut!8ppqb4",
      "direction": "row",
      "splitPercentage": 35.870382522716454
    },
    "direction": "column",
    "splitPercentage": 73.19587042083084
  }
} as const;
