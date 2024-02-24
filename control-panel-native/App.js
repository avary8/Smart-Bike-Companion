import 'react-native-gesture-handler'
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import AppNavigator from "./utils/AppNavigator";
import { StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";

export default function App() {
  return (
    // Wrapper component that powers the gestures of the BottomSheet library
    <GestureHandlerRootView style={styles.appContainer}>
      {/* Wrapper component to enable the use of the BottomSheet library */}
      <BottomSheetModalProvider>
        {/* Controls the device's status bar (Expo SDK) */}
        <StatusBar style="auto" />
        {/* Main navigation component */}
        <AppNavigator />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
});