import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Keyboard,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

export default function TodoModal({ handleAddTodo, bottomSheetModalRef }) {
  // State to keep track of the user's input
  const [todoInput, setTodoInput] = useState("");

  // Extra state variables to fix an Android bug with the BottomSheet library
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [enableDismissOnClose, setEnableDismissOnClose] = useState(true);

  // Ref to the input field -> allows us to focus on it when the modal is open
  const inputRef = useRef(null);

  // Extra useEffect to fix an Android bug with the BottomSheet library
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => setKeyboardOpen(true)
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => setKeyboardOpen(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Extra useEffect to fix an Android bug with the BottomSheet library
  useEffect(() => {
    setEnableDismissOnClose(!keyboardOpen);
  }, [keyboardOpen]);

  // Function to handle the creatio of a new task (calls the function passed in the params via the parent component)
  const handleAddTaskButton = () => {
    handleAddTodo(todoInput);
    setTodoInput("");
    bottomSheetModalRef.current?.dismiss();
  };

  // Renders a "dark" background whenever the modal is open
  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        {...props}
      />
    ),
    []
  );

  // BottomSheetModal is a component from the BottomSheet library that allows us to create a modal that slides up from the bottom of the screen
  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={["25%"]}
      backdropComponent={renderBackdrop}
      // When the modal is open, focus on the input field
      onChange={(index) => {
        if (index === 0) {
          inputRef.current?.focus();
        }
      }}
      android_keyboardInputMode="adjustResize"
      enableDismissOnClose={enableDismissOnClose}
    >
      <View style={styles.modalContainer}>
        {/* Text input field to create a new task */}
        <BottomSheetTextInput
          ref={inputRef}
          style={styles.input}
          value={todoInput}
          onChangeText={setTodoInput}
          placeholder="Task Name"
        />
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            // On click of the "cancel" button, dismiss the modal
            onPress={() => bottomSheetModalRef.current?.dismiss()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            // On click of the "add" button, call the function to create a new task
            onPress={handleAddTaskButton}
          >
            <Ionicons name="add" size={25} color="white" />
            <Text style={styles.addButtonText}>Add task</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    alignItems: "left",
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 10,
  },
  input: {
    width: "90%",
    padding: 10,
    fontSize: 20,
  },
  buttonsContainer: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "center",
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 10,
    borderRadius: 5,
    backgroundColor: "rgba(229, 229, 229, 0.8)", // 80% opacity
    marginTop: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#363636",
  },
  addButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 10,
    borderRadius: 5,
    backgroundColor: "#39485e",
    marginTop: 25,
    flexDirection: "row",
    alignItems: "center",
  },
  addButtonText: {
    color: "white",
    paddingLeft: "3%",
  },
});