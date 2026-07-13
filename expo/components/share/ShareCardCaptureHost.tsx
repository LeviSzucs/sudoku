import React from "react";
import { StyleSheet, View } from "react-native";
import ViewShot from "react-native-view-shot";

import SudoDuelShareCard from "@/components/share/SudoDuelShareCard";
import type { SudoDuelShareCardPayload } from "@/lib/shareCards";

interface Props {
  payload: SudoDuelShareCardPayload | null;
  captureRef: React.RefObject<ViewShot | null>;
}

export default function ShareCardCaptureHost({ payload, captureRef }: Props) {
  if (!payload) return null;

  return (
    <View pointerEvents="none" style={styles.hiddenHost}>
      <ViewShot
        ref={captureRef}
        collapsable={false}
        options={{
          format: "png",
          quality: 1,
          result: "tmpfile",
        }}
      >
        <SudoDuelShareCard payload={payload} />
      </ViewShot>
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenHost: {
    position: "absolute",
    left: -1200,
    top: 0,
    opacity: 0.01,
  },
});
