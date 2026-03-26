import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  progress?: number; // 0-100, undefined = indeterminate
  color?: string;
}

export const ProgressBar: React.FC<Props> = ({
  progress,
  color = '#7c6aff',
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (progress === undefined) {
      // Indeterminate shimmer
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    } else {
      anim.stopAnimation();
    }
  }, [progress]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 300],
  });

  return (
    <View style={styles.track}>
      {progress !== undefined ? (
        <View style={[styles.fill, { width: `${progress}%`, backgroundColor: color }]} />
      ) : (
        <Animated.View
          style={[
            styles.indeterminate,
            { backgroundColor: color, transform: [{ translateX }] },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 6, backgroundColor: '#1e1e2e',
    borderRadius: 3, overflow: 'hidden', width: '100%',
  },
  fill: { height: 6, borderRadius: 3 },
  indeterminate: { height: 6, width: 80, borderRadius: 3 },
});