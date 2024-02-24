import { Text, TouchableOpacity, StyleSheet } from "react-native";

export default NoteItem = ({ item, navigation }) => {
  const date = new Date(item.lastModified);

  // Format the date to be more human-readable
  const formattedDate = date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <TouchableOpacity
      style={styles.noteItem}
      // On click of the note, navigate to the NoteEditor screen with the note as a parameter
      onPress={() => navigation.navigate("NoteEditor", { note: item })}
    >
      {/* Display the title, content, and date of the note */}
      <Text style={styles.noteTtitle} numberOfLines={1} ellipsizeMode="tail">
        {item.title}
      </Text>
      <Text style={styles.noteContent} numberOfLines={1} ellipsizeMode="tail">
        {item.content}
      </Text>
      <Text style={styles.noteDate}>{formattedDate}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  noteItem: {
    height: 150,
    alignItems: "left",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#c7c7c7",
    paddingVertical: "5%",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  noteTtitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  noteContent: {
    fontSize: 15,
    fontWeight: "300",
  },
  noteDate: {
    fontSize: 12,
    fontWeight: "300",
  },
});