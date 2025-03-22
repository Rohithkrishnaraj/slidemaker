import { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Image, Dimensions } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slide } from '../utils/excelProcessor';

const { width } = Dimensions.get('window');

export default function EditScreen() {
  const params = useLocalSearchParams();
  const [slideData, setSlideData] = useState<Slide>({
    id: '',
    image: '',
    text: '',
    highlighted: '',
    style: '',
    backgroundVoice: ''
  });
  const [slideIndex, setSlideIndex] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);

  // Load initial data only once
  useEffect(() => {
    let mounted = true;

    const loadData = () => {
      if (params.slide) {
        try {
          const parsedSlide = JSON.parse(params.slide as string);
          if (mounted) {
            setSlideData(parsedSlide);
          }
        } catch (error) {
          console.error('Error parsing slide data:', error);
        }
      }
      if (params.index && mounted) {
        setSlideIndex(parseInt(params.index as string));
      }
      if (params.totalSlides && mounted) {
        setTotalSlides(parseInt(params.totalSlides as string));
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array to run only once

  const handleSave = useCallback(() => {
    router.back();
    // Pass the updated data back through router params
    router.setParams({
      updatedSlide: JSON.stringify(slideData),
      index: slideIndex.toString()
    });
  }, [slideData, slideIndex]);

  const handleTextChange = useCallback((text: string) => {
    setSlideData(prev => ({ ...prev, text }));
  }, []);

  const handleHighlightedChange = useCallback((highlighted: string) => {
    setSlideData(prev => ({ ...prev, highlighted }));
  }, []);

  const handleVoiceChange = useCallback((backgroundVoice: string) => {
    setSlideData(prev => ({ ...prev, backgroundVoice }));
  }, []);

  const handleStyleChange = useCallback((style: string) => {
    setSlideData(prev => ({ ...prev, style: style.toLowerCase() }));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text variant="titleMedium">
            Editing Slide {slideIndex + 1} of {totalSlides}
          </Text>
        </View>

        {slideData.image !== 'No image selected' && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: slideData.image }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.form}>
          <TextInput
            label="Text"
            value={slideData.text}
            onChangeText={handleTextChange}
            style={styles.input}
            multiline
          />

          <TextInput
            label="Highlighted Text"
            value={slideData.highlighted}
            onChangeText={handleHighlightedChange}
            style={styles.input}
            multiline
          />

          <TextInput
            label="Text to Speech"
            value={slideData.backgroundVoice}
            onChangeText={handleVoiceChange}
            style={styles.input}
            multiline
          />

          <TextInput
            label="Style (bold, italic, normal)"
            value={slideData.style}
            onChangeText={handleStyleChange}
            style={styles.input}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="outlined"
          onPress={() => router.back()}
          style={styles.footerButton}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          style={styles.footerButton}
        >
          Save Changes
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  imageContainer: {
    width: width * 0.9,
    height: width * 0.6,
    alignSelf: 'center',
    marginVertical: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  form: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 4,
  },
}); 