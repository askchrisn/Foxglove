// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
import {
  ComboBox,
  DefaultButton,
  Dropdown,
  IDropdownOption,
  Slider,
  Stack,
  Toggle,
  useTheme,
} from "@fluentui/react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useResizeDetector } from "react-resize-detector";
import { CameraStore, CameraListener, CameraState, DEFAULT_CAMERA_STATE } from "regl-worldview";

import * as PanelAPI from "@foxglove-studio/app/PanelAPI";
import EmptyState from "@foxglove-studio/app/components/EmptyState";
import Flex from "@foxglove-studio/app/components/Flex";
import Panel from "@foxglove-studio/app/components/Panel";
import PanelToolbar from "@foxglove-studio/app/components/PanelToolbar";
import { useAssets } from "@foxglove-studio/app/context/AssetContext";
import useCleanup from "@foxglove-studio/app/hooks/useCleanup";
import { usePreviousValue } from "@foxglove-studio/app/hooks/usePreviousValue";
import { JointState } from "@foxglove-studio/app/types/Messages";
import { SaveConfig } from "@foxglove-studio/app/types/panels";
import filterMap from "@foxglove-studio/app/util/filterMap";

import { JointValueSliders } from "./JointValueSliders";
import { Renderer } from "./Renderer";
import helpContent from "./index.help.md";

export type EventTypes = {
  cameraMove: () => void;
};
type Config = {
  jointStatesTopic?: string;
  customJointValues?: Record<string, number>;
  opacity?: number;
};
export type Props = {
  config: Config;
  saveConfig: SaveConfig<Config>;
};

const DEFAULT_DISTANCE = 5;

function URDFViewer({ config, saveConfig }: Props) {
  const { customJointValues, jointStatesTopic, opacity } = config;
  const [canvas, setCanvas] = useState<HTMLCanvasElement | ReactNull>(ReactNull);
  const { ref: resizeRef, width, height } = useResizeDetector();
  const { assets } = useAssets();
  const [selectedAssetId, setSelectedAssetId] = useState<string | undefined>();

  const model = useMemo(() => {
    const asset = assets.find(({ type, uuid }) => uuid === selectedAssetId && type === "urdf");
    return asset?.model;
  }, [assets, selectedAssetId]);

  // Automatically select newly added URDF assets
  const prevAssets = usePreviousValue(assets);
  useEffect(() => {
    const prevAssetIds = new Set(prevAssets?.map(({ uuid }) => uuid));
    for (const asset of assets) {
      if (!prevAssetIds.has(asset.uuid) && asset.type === "urdf") {
        setSelectedAssetId(asset.uuid);
        return;
      }
    }
  }, [assets, prevAssets, selectedAssetId]);

  const [renderer] = useState(() => new Renderer());

  useCleanup(() => {
    renderer.dispose();
  });

  useLayoutEffect(() => {
    if (canvas) {
      renderer.setCanvas(canvas);
    }
  }, [canvas, renderer]);

  useLayoutEffect(() => {
    if (width != undefined && height != undefined) {
      renderer.setSize(width, height);
    }
  }, [width, height, renderer]);

  useLayoutEffect(() => {
    renderer.setModel(model);
  }, [renderer, model]);

  const {
    [jointStatesTopic ?? ""]: [latestJointStatesMessage] = [],
  } = PanelAPI.useMessagesByTopic<JointState>({
    topics: jointStatesTopic != undefined ? [jointStatesTopic] : [],
    historySize: 1,
  });

  const useCustomJointValues = jointStatesTopic == undefined;
  const jointValues = useMemo(() => {
    if (useCustomJointValues) {
      return customJointValues;
    }
    const values: Record<string, number> = {};
    const jointState = latestJointStatesMessage?.message;
    if (jointState) {
      jointState.name.forEach((name, index) => {
        const position = jointState.position[index];
        if (position != undefined) {
          values[name] = position;
        }
      });
    }
    return values;
  }, [customJointValues, latestJointStatesMessage, useCustomJointValues]);

  useLayoutEffect(() => {
    if (jointValues) {
      renderer.setJointValues(jointValues);
    }
  }, [jointValues, renderer]);

  useLayoutEffect(() => {
    if (opacity != undefined) {
      renderer.setOpacity(opacity);
    }
  }, [renderer, opacity]);

  const [cameraState, setCameraState] = useState(() => ({
    ...DEFAULT_CAMERA_STATE,
    distance: DEFAULT_DISTANCE,
  }));
  const [cameraStore] = useState(() => new CameraStore(setCameraState, cameraState));
  const cameraCentered =
    cameraState.targetOffset[0] === 0 &&
    cameraState.targetOffset[1] === 0 &&
    cameraState.targetOffset[2] === 0;

  useLayoutEffect(() => {
    renderer.setCameraState(cameraState);
    renderer.render();
  });

  const setCustomJointValues = useCallback(
    (values: typeof customJointValues) => {
      saveConfig({ customJointValues: values });
    },
    [saveConfig],
  );

  const { topics } = PanelAPI.useDataSourceInfo();
  const topicOptions = useMemo(() => {
    const options = filterMap(topics, ({ name, datatype }) =>
      datatype === "sensor_msgs/JointState" ? { key: name, text: name } : undefined,
    );
    // Include a custom option that may not be present (yet) in the list of topics
    if (
      jointStatesTopic != undefined &&
      jointStatesTopic !== "" &&
      !options.some(({ key }) => key === jointStatesTopic)
    ) {
      options.unshift({ key: jointStatesTopic, text: jointStatesTopic });
    }
    return options;
  }, [jointStatesTopic, topics]);

  const assetOptions: IDropdownOption[] = useMemo(() => {
    return filterMap(assets, (asset) =>
      asset.type === "urdf" ? { key: asset.uuid, text: asset.name } : undefined,
    );
  }, [assets]);

  const theme = useTheme();
  return (
    <Flex col clip>
      <PanelToolbar helpContent={helpContent}>
        <Stack grow horizontal verticalAlign="baseline">
          <Toggle
            inlineLabel
            offText="Manual joint control"
            onText="Topic"
            checked={!useCustomJointValues}
            onChange={(event, checked) =>
              saveConfig({
                jointStatesTopic:
                  checked ?? false ? URDFViewer.defaultConfig.jointStatesTopic : undefined,
              })
            }
          />
          {!useCustomJointValues && (
            <ComboBox
              allowFreeform
              options={topicOptions}
              selectedKey={jointStatesTopic}
              onChange={(event, option, index, value) => {
                if (option) {
                  saveConfig({ jointStatesTopic: option.key as string });
                } else if (value != undefined) {
                  saveConfig({ jointStatesTopic: value });
                }
              }}
            />
          )}
        </Stack>
      </PanelToolbar>
      {model == undefined ? (
        <EmptyState>Drag and drop a URDF file to visualize it.</EmptyState>
      ) : (
        <Flex row clip>
          <div ref={resizeRef} style={{ flex: "1 1 auto", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <CameraListener cameraStore={cameraStore} shiftKeys={true}>
                <canvas ref={(el) => setCanvas(el)} width={width} height={height} />
              </CameraListener>
            </div>
            <div
              style={{
                position: "absolute",
                top: theme.spacing.s1,
                left: theme.spacing.s1,
              }}
            >
              <Dropdown
                options={assetOptions}
                selectedKey={selectedAssetId}
                onChange={(event, option) =>
                  option != undefined && setSelectedAssetId(option.key as string)
                }
              />
            </div>
            <Stack
              horizontal
              horizontalAlign="space-between"
              wrap
              style={{
                position: "absolute",
                bottom: theme.spacing.s1,
                left: theme.spacing.s1,
                right: theme.spacing.s1,
              }}
            >
              <Stack.Item grow style={{ minWidth: 120, maxWidth: 300 }}>
                <Slider
                  ariaLabel="Opacity"
                  min={0}
                  max={1}
                  step={0.01}
                  value={opacity}
                  valueFormat={(value) => `${(value * 100).toFixed(0)}%`}
                  onChange={(value) => saveConfig({ opacity: value })}
                />
              </Stack.Item>
              {!cameraCentered && (
                <DefaultButton
                  text="Re-center"
                  onClick={() => {
                    const newState: CameraState = {
                      ...cameraState,
                      targetOffset: [0, 0, 0],
                      distance: DEFAULT_DISTANCE,
                    };
                    cameraStore.setCameraState(newState);
                    setCameraState(newState);
                  }}
                />
              )}
            </Stack>
          </div>
          {useCustomJointValues && model && (
            <JointValueSliders
              model={model}
              customJointValues={customJointValues}
              onChange={setCustomJointValues}
            />
          )}
        </Flex>
      )}
    </Flex>
  );
}

URDFViewer.panelType = "URDFViewer";
URDFViewer.defaultConfig = {
  jointStatesTopic: "/joint_states",
  opacity: 0.75,
};
export default Panel(URDFViewer);
