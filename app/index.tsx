import { StyleSheet, View, Image } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.description}>
          Create beautiful presentations from your Excel files and images
        </Text>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => router.push('/upload')}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Create
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => router.push('/my-slides')}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            View
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  description: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
}); 