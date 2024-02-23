// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { MirObstacleCloud } from "@foxglove/studio-base/mir/ros";
import { PartialMessageEvent } from "@foxglove/studio-base/panels/ThreeDeeRender/SceneExtension";
import { PointCloud2 } from "@foxglove/studio-base/panels/ThreeDeeRender/ros";

export function handleMirPointCloud(
  messageEvent: PartialMessageEvent<MirObstacleCloud>,
  handleRosPointCloud: (messageEvent: PartialMessageEvent<PointCloud2>) => void): void
{
  const new_msg = MirToRos(messageEvent);
  handleRosPointCloud(new_msg);
};

function MirToRos( messageEvent: PartialMessageEvent<MirObstacleCloud>): PartialMessageEvent<PointCloud2> {
  return {
    topic: messageEvent.topic,
    schemaName: messageEvent.schemaName,
    receiveTime: messageEvent.receiveTime,
    publishTime: messageEvent.publishTime,
    message: messageEvent.message.cloud!,
    sizeInBytes: messageEvent.sizeInBytes,
  };
}
