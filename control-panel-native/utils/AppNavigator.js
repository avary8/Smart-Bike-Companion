import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import Dashboard from '../screens/Dashboard';


// Creates the navigator at the bottom of the screen (for the Todos and Notes screens)
const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Screen
        name="Dashboard"
        component={Dashboard}
      />


    </NavigationContainer>

  );
}