import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const data = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
    // Add more data items as needed
  ];
  
const Dashboard = () => {
    const renderItem = ({ item }) => (
        <View style={styles.item}>
        <Text style={styles.itemText}>{item.name}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <Text>hello</Text>
        {/* <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            numColumns={2} // Set number of columns for grid layout
        /> */}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#ffffff',
    },
    item: {
        flex: 1,
        margin: 8,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    itemText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default Dashboard;