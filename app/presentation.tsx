import { useState, useEffect, useRef } from 'react';
import { View, Image, Dimensions, TouchableOpacity, StatusBar, ScrollView, TextStyle, ViewStyle, Platform, Animated, PanResponder, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Slide } from '../utils/excelProcessor';
import * as Speech from 'expo-speech';
import * as ScreenOrientation from 'expo-screen-orientation';
import React from 'react';
import { VolumeManager } from 'react-native-volume-manager';
import * as Brightness from 'expo-brightness';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const HIGHLIGHT_COLORS = [
  '#ffeb3b', // Yellow
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#FF9800', // Orange
  '#E91E63', // Pink
  '#9C27B0', // Purple
];

// Visual-only slider component (non-interactive)
interface VisualSliderProps {
  value: number;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
  style?: ViewStyle;
}

const VisualSlider: React.FC<VisualSliderProps> = ({
  value,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
  style
}) => {
  const [trackWidth, setTrackWidth] = useState(0);
  
  // Calculate thumb position based on value
  const thumbPosition = value * trackWidth;
  
  return (
    <View 
      style={[styles.sliderContainer, style]}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setTrackWidth(width);
      }}
    >
      {/* Track background */}
      <View style={[styles.track, { backgroundColor: maximumTrackTintColor }]}>
        {/* Filled track */}
        <View
          style={[
            styles.filledTrack,
            {
              backgroundColor: minimumTrackTintColor,
              width: `${value * 100}%`
            }
          ]}
        />
      </View>
      
      {/* Thumb */}
      <View
        style={[
          styles.thumb,
          {
            backgroundColor: thumbTintColor,
            transform: [{ translateX: thumbPosition }]
          }
        ]}
      />
    </View>
  );
};

export default function PresentationScreen() {
  const params = useLocalSearchParams();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isTextExpanded, setIsTextExpanded] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [shouldAutoAdvance, setShouldAutoAdvance] = useState(true);
  const [volume, setVolume] = useState(0.5);
  const [brightness, setBrightness] = useState(0.5);
  const [showSliders, setShowSliders] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const autoCloseTimer = useRef<NodeJS.Timeout | null>(null);

  // Step size for button controls
  const VOLUME_STEP = 0.05;
  const BRIGHTNESS_STEP = 0.05;

  // Initialize and cleanup orientation handling
  useEffect(() => {
    const setupOrientation = async () => {
      await ScreenOrientation.unlockAsync();
      
      const subscription = ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
        const isLandscapeOrientation = 
          orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
          orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
        setIsLandscape(isLandscapeOrientation);
        if (isLandscapeOrientation) {
          setIsTextExpanded(true);
        }
        StatusBar.setHidden(isLandscapeOrientation);
      });

      return () => {
        subscription.remove();
      };
    };

    setupOrientation();

    return () => {
      const cleanup = async () => {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        StatusBar.setHidden(false);
        Speech.stop();
      };
      cleanup();
    };
  }, []);

  // Initialize volume and brightness
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // Request brightness permissions
        const { status } = await Brightness.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Brightness permission not granted');
          return;
        }

        // Initialize volume
        const { volume: initialVolume } = await VolumeManager.getVolume();
        setVolume(initialVolume);

        // Disable native volume UI
        VolumeManager.showNativeVolumeUI({ enabled: false });

        // Listen for volume changes
        const volumeListener = VolumeManager.addVolumeListener((result) => {
          setVolume(result.volume);
        });

        // Initialize brightness
        const currentBrightness = await Brightness.getBrightnessAsync();
        setBrightness(currentBrightness);

        return () => {
          volumeListener.remove();
        };
      } catch (error) {
        console.error('Error initializing settings:', error);
      }
    };

    initializeSettings();
  }, []);

  // Parse slides data
  useEffect(() => {
    if (params.slides) {
      try {
        const parsedSlides = JSON.parse(params.slides as string);
        const slidesArray = Array.isArray(parsedSlides) ? parsedSlides : [parsedSlides];
        setSlides(slidesArray);
        if (params.isSingleSlide === 'false') {
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Error parsing slides:', error);
      }
    }
  }, [params.slides, params.isSingleSlide]);

  // Separate useEffect for handling TTS on slide change
  useEffect(() => {
    const playVoice = async () => {
      await Speech.stop();
      const currentVoiceText = slides[currentSlide]?.backgroundVoice;
      
      if (currentVoiceText && !isVoiceMuted) {
        try {
          setIsSpeaking(true);
          await Speech.speak(currentVoiceText, {
            volume: volume,
            onDone: () => {
              setIsSpeaking(false);
            },
            onError: () => {
              setIsSpeaking(false);
            }
          });
        } catch (error) {
          console.error('Error playing voice:', error);
          setIsSpeaking(false);
        }
      }
    };

    playVoice();
  }, [currentSlide, slides, isVoiceMuted]);

  // Separate useEffect for handling autoplay
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleAutoPlay = async () => {
      if (!isPlaying) return;

      const currentVoiceText = slides[currentSlide]?.backgroundVoice;
      
      if (currentVoiceText && !isVoiceMuted) {
        // Wait for TTS to finish before proceeding
        await new Promise<void>((resolve) => {
          const checkSpeaking = setInterval(() => {
            if (!isSpeaking) {
              clearInterval(checkSpeaking);
              resolve();
            }
          }, 100);
        });
      }

      // After TTS is done (or if there was no TTS), wait 2 seconds before next slide
      // Only schedule next slide if we're still in autoplay mode
      if (isPlaying) {
        timeoutId = setTimeout(() => {
          // Double check we're still in autoplay mode when timeout fires
          if (isPlaying && currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
          } else {
            setIsPlaying(false);
          }
        }, 2000);
      }
    };

    handleAutoPlay();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentSlide, slides, isVoiceMuted, isPlaying, isSpeaking]);

  // Update TTS volume without restarting
  useEffect(() => {
    // No need to do anything here since we don't want to restart TTS on volume change
  }, [volume]);

  // Button handlers for volume control
  const increaseVolume = () => {
    const newVolume = Math.min(1, volume + VOLUME_STEP);
    setVolume(newVolume);
    updateVolume(newVolume);
    resetAutoCloseTimer();
  };

  const decreaseVolume = () => {
    const newVolume = Math.max(0, volume - VOLUME_STEP);
    setVolume(newVolume);
    updateVolume(newVolume);
    resetAutoCloseTimer();
  };

  // Button handlers for brightness control
  const increaseBrightness = () => {
    const newBrightness = Math.min(1, brightness + BRIGHTNESS_STEP);
    setBrightness(newBrightness);
    updateBrightness(newBrightness);
    resetAutoCloseTimer();
  };

  const decreaseBrightness = () => {
    const newBrightness = Math.max(0, brightness - BRIGHTNESS_STEP);
    setBrightness(newBrightness);
    updateBrightness(newBrightness);
    resetAutoCloseTimer();
  };

  // Update system volume
  const updateVolume = (newValue: number) => {
    VolumeManager.setVolume(newValue, {
      type: Platform.OS === 'android' ? 'music' : undefined,
      showUI: false,
      playSound: false,
    }).catch(error => {
      console.error('Error setting volume:', error);
    });
  };

  // Update system brightness
  const updateBrightness = (newValue: number) => {
    Brightness.setBrightnessAsync(newValue).catch(error => {
      console.error('Error setting brightness:', error);
    });
  };

  // Toggle sliders visibility with animation
  const toggleSliders = () => {
    if (showSliders) {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowSliders(false));
    } else {
      setShowSliders(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    // Reset auto-close timer
    resetAutoCloseTimer();
  };

  // Reset auto-close timer on interaction
  const resetAutoCloseTimer = () => {
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current);
    }
    autoCloseTimer.current = setTimeout(() => {
      if (showSliders) {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowSliders(false));
      }
    }, 3000);
  };

  const handlePrevious = async () => {
    await Speech.stop();
    setCurrentSlide(prev => Math.max(0, prev - 1));
  };

  const handleNext = async () => {
    await Speech.stop();
    setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1));
  };

  const handleFirst = async () => {
    await Speech.stop();
    setCurrentSlide(0);
  };

  const handleLast = async () => {
    await Speech.stop();
    setCurrentSlide(slides.length - 1);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
    // Stop TTS when autoplay is stopped
    if (isPlaying) {
      Speech.stop();
      setIsSpeaking(false);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const toggleVoice = async () => {
    const currentVoiceText = slides[currentSlide]?.backgroundVoice;
    if (!currentVoiceText) return;

    if (!isVoiceMuted) {
      await Speech.stop();
      setIsSpeaking(false);
    } else {
      try {
        setIsSpeaking(true);
        await Speech.speak(currentVoiceText, {
          volume: volume,
          onDone: () => {
            setIsSpeaking(false);
          },
          onError: () => {
            setIsSpeaking(false);
          }
        });
      } catch (error) {
        console.error('Error playing voice:', error);
        setIsSpeaking(false);
      }
    }
    setIsVoiceMuted(!isVoiceMuted);
  };

  const toggleOrientation = async () => {
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      }
    } catch (error) {
      console.error('Error changing orientation:', error);
    }
  };

  const currentSlideData = slides[currentSlide];

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim();
  };

  const getTextStyles = (highlightWord: { word: string; color: string; styles: string[] }): TextStyle[] => {
    const styles: TextStyle[] = [
      { color: highlightWord.color },
      highlightWord.styles.includes('h1') && { 
        fontSize: 40,
        fontWeight: 'bold',
        lineHeight: 60,
        paddingTop: 20,
        paddingBottom: 12,
        marginVertical: 8,
        includeFontPadding: false,
        textAlignVertical: 'center',
        alignSelf: 'center'
      },
      highlightWord.styles.includes('h2') && { 
        fontSize: 36,
        fontWeight: 'bold',
        lineHeight: 54,
        paddingTop: 16,
        paddingBottom: 10,
        marginVertical: 6,
        includeFontPadding: false,
        textAlignVertical: 'center',
        alignSelf: 'center'
      },
      highlightWord.styles.includes('h3') && { 
        fontSize: 32,
        fontWeight: 'bold',
        lineHeight: 44,
        paddingVertical: 8,
        marginVertical: 6,
        includeFontPadding: false
      },
      highlightWord.styles.includes('h4') && { 
        fontSize: 28,
        fontWeight: 'bold',
        lineHeight: 40,
        paddingVertical: 8,
        marginVertical: 4,
        includeFontPadding: false
      },
      highlightWord.styles.includes('h5') && { 
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 36,
        paddingVertical: 6,
        marginVertical: 4,
        includeFontPadding: false
      },
      highlightWord.styles.includes('h6') && { 
        fontSize: 20,
        fontWeight: 'bold',
        lineHeight: 32,
        paddingVertical: 6,
        marginVertical: 4,
        includeFontPadding: false
      },
      highlightWord.styles.includes('bold') && { fontWeight: 'bold' as const },
      highlightWord.styles.includes('italic') && { fontStyle: 'italic' as const },
      highlightWord.styles.includes('underline') && { textDecorationLine: 'underline' as const }
    ].filter(Boolean) as TextStyle[];

    return styles;
  };

  const renderStyledText = (text: string, highlighted: string, style: string) => {
    if (!text) return null;

    const displayText = !isTextExpanded ? truncateText(text, 100) : text;
    const textLines = displayText.split('\n').length;
    const isShortText = textLines <= 2;

    const highlightedWords = highlighted ? highlighted.split(' ').map((word, index) => ({
      word: word.trim(),
      color: HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length],
      styles: style ? style.split(' ') : []
    })).filter(w => w.word) : [];

    const pattern = highlightedWords.length > 0 
      ? new RegExp(`(${highlightedWords.map(h => h.word).join('|')})`, 'gi')
      : null;

    const baseTextStyle = { 
      color: '#fff', 
      fontSize: 24, 
      textAlign: isLandscape && isShortText ? 'center' : 'justify',
      lineHeight: 36, 
      includeFontPadding: false, 
      textAlignVertical: 'center' as const,
      paddingTop: 28 
    } as const;

    if (!pattern) {
      return (
        <Text style={baseTextStyle}>
          {displayText}
          {!isTextExpanded && text.length > 100 && (
            <Text style={{ 
              color: '#2196F3', 
              fontSize: 16, 
              fontWeight: 'bold', 
              marginLeft: 4, 
              textDecorationLine: 'underline', 
              opacity: 0.8, 
              backgroundColor: 'rgba(0, 0, 0, 0.3)', 
              paddingHorizontal: 8, 
              paddingVertical: 4, 
              borderRadius: 4, 
              marginTop: 8 
            }}>
              {" "}...read more
            </Text>
          )}
        </Text>
      );
    }

    const parts = displayText.split(pattern);

    return (
      <Text style={baseTextStyle}>
        {parts.map((part, index) => {
          const highlightWord = highlightedWords.find(h => 
            h.word.toLowerCase() === part.toLowerCase()
          );

          if (highlightWord) {
            return (
              <Text 
                key={index}
                style={getTextStyles(highlightWord)}
              >
                {part}
              </Text>
            );
          }
          return part;
        })}
        {!isTextExpanded && text.length > 100 && (
          <Text style={{ 
            color: '#2196F3', 
            fontSize: 16, 
            fontWeight: 'bold', 
            marginLeft: 4, 
            textDecorationLine: 'underline', 
            opacity: 0.8, 
            backgroundColor: 'rgba(0, 0, 0, 0.3)', 
            paddingHorizontal: 8, 
            paddingVertical: 4, 
            borderRadius: 4, 
            marginTop: 8 
          }}>
            {" "}...read more
          </Text>
        )}
      </Text>
    );
  };

  const toggleTextExpansion = () => {
    setIsTextExpanded(!isTextExpanded);
  };

  if (!currentSlideData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text>No slides available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasText = currentSlideData.text;
  const hasImage = currentSlideData.image && 
    currentSlideData.image !== 'No image selected' && 
    currentSlideData.image.trim() !== '';

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#000',
      ...(isLandscape && { flexDirection: 'row' })
    }}>
      <TouchableOpacity 
        style={{ 
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          width: '100%',
          height: '100%'
        }} 
        onPress={toggleControls}
        activeOpacity={1}
      >
        <View style={{ 
          flex: 1,
          width: '100%',
          height: '100%',
          position: 'relative',
          justifyContent: 'center',
          alignItems: 'center',
          paddingBottom: 80
        }}>
          {hasImage && !isTextExpanded && (
            <Image
              source={{ uri: currentSlideData.image }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          )}
          {hasText && (
            <View style={{ 
              position: 'absolute',
              bottom: hasImage ? 80 : 0,
              left: 0,
              right: 0,
              top: !hasImage ? 0 : undefined,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 20,
              paddingTop: 70,
              ...(isTextExpanded && {
                top: 60,
                bottom: 60,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                paddingTop: 20,
                paddingBottom: 20
              }),
              ...(isLandscape && isTextExpanded && {
                paddingTop: 0,
                paddingBottom: 0
              })
            }}>
              {isLandscape && isTextExpanded ? (
                <View style={{ 
                  flexDirection: 'row',
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0
                }}>
                  {hasImage && (
                    <View style={{ 
                      width: '50%',
                      height: '100%',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Image
                        source={{ uri: currentSlideData.image }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  <View style={{ 
                    width: hasImage ? '50%' : '80%',
                    maxWidth: !hasImage ? 800 : undefined,
                    height: '100%',
                    backgroundColor: isLandscape && !isTextExpanded ? 'transparent' : 'rgba(0, 0, 0, 0.7)',
                    paddingHorizontal: 24,
                    paddingVertical: 20,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <ScrollView 
                      contentContainerStyle={{ 
                        flexGrow: 1,
                        justifyContent: 'center',
                        alignItems: hasImage ? 'flex-start' : 'center',
                        width: '100%'
                      }}
                    >
                      <TouchableOpacity onPress={toggleTextExpansion}>
                        {renderStyledText(currentSlideData.text, currentSlideData.highlighted, currentSlideData.style)}
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </View>
              ) : isTextExpanded ? (
                <View style={{ 
                  flex: 1,
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: hasImage ? 'flex-start' : 'center',
                  ...(hasImage ? {} : { paddingTop: 60, paddingBottom: 60 })
                }}>
                  {hasImage && (
                    <View style={{ 
                      width: '100%',
                      height: '40%',
                      backgroundColor: '#000',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Image
                        source={{ uri: currentSlideData.image }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  <View style={{ 
                    width: hasImage ? '90%' : '80%',
                    maxWidth: 800,
                    flex: 1,
                    marginTop: hasImage ? 70 : 0,
                    marginBottom: 20,
                    paddingHorizontal: 24,
                    paddingTop: 70,
                    paddingBottom: 32,
                    backgroundColor: isLandscape ? 'transparent' : 'rgba(0, 0, 0, 0.7)',
                    borderRadius: 12,
                    ...(!hasImage && {
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginTop: 0,
                      marginBottom: 0
                    })
                  }}>
                    <ScrollView contentContainerStyle={{ 
                      flexGrow: 1,
                      ...(hasImage ? {} : {
                        justifyContent: 'center',
                        alignItems: 'center'
                      })
                    }}>
                      <TouchableOpacity onPress={toggleTextExpansion}>
                        {renderStyledText(currentSlideData.text, currentSlideData.highlighted, currentSlideData.style)}
                      </TouchableOpacity>
                    </ScrollView>
                  </View>
                </View>
              ) : (
                <View style={{ 
                  width: '100%',
                  maxWidth: 800,
                  minHeight: 150,
                  backgroundColor: isLandscape && !isTextExpanded ? 'transparent' : 'rgba(0, 0, 0, 0.7)',
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 24,
                  paddingTop: 70,
                  paddingBottom: 32,
                  ...(hasImage ? {
                    marginTop: 48,
                    marginBottom: 20
                  } : {
                    position: 'absolute',
                    top: '50%',
                    transform: [{ translateY: -75 }],
                    marginTop: 0,
                    marginBottom: 0
                  })
                }}>
                  <TouchableOpacity onPress={toggleTextExpansion}>
                    {renderStyledText(currentSlideData.text, currentSlideData.highlighted, currentSlideData.style)}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {showControls && (
          <View style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10
          }}>
            {/* Sliders Panel */}
            {showSliders && (
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  padding: 16,
                  zIndex: 30,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                {/* Volume Controls with + and - buttons */}
                <View style={{
                  marginBottom: 20,
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}>
                    <IconButton
                      icon="volume-medium"
                      iconColor="white"
                      size={24}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginRight: 8 }}>
                      Volume
                    </Text>
                    <Text style={{ color: 'white', fontSize: 14, marginLeft: 'auto' }}>
                      {Math.round(volume * 100)}%
                    </Text>
                  </View>
                  
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={decreaseVolume}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.buttonText}>-</Text>
                    </TouchableOpacity>
                    
                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <VisualSlider
                        value={volume}
                        minimumTrackTintColor="#2196F3"
                        maximumTrackTintColor="#666"
                        thumbTintColor="#2196F3"
                      />
                    </View>
                    
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={increaseVolume}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.buttonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Brightness Controls with + and - buttons */}
                <View style={{
                  marginBottom: 12,
                }}>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}>
                    <IconButton
                      icon="brightness-6"
                      iconColor="white"
                      size={24}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', marginRight: 8 }}>
                      Brightness
                    </Text>
                    <Text style={{ color: 'white', fontSize: 14, marginLeft: 'auto' }}>
                      {Math.round(brightness * 100)}%
                    </Text>
                  </View>
                  
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={decreaseBrightness}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.buttonText}>-</Text>
                    </TouchableOpacity>
                    
                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <VisualSlider
                        value={brightness}
                        minimumTrackTintColor="#FF9800"
                        maximumTrackTintColor="#666"
                        thumbTintColor="#FF9800"
                      />
                    </View>
                    
                    <TouchableOpacity
                      style={styles.controlButton}
                      onPress={increaseBrightness}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.buttonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            )}

            <View style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 20,
              ...(isLandscape && { paddingTop: 0 })
            }}>
              <IconButton 
                icon={isLandscape ? "screen-rotation" : "screen-rotation-lock"}
                iconColor="white"
                size={28}
                onPress={toggleOrientation}
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
              />
              <Text style={{ color: 'white', fontSize: 16 }}>
                {currentSlide + 1} / {slides.length}
              </Text>
              <View style={{ flexDirection: 'row' }}>
                <IconButton 
                  icon={isVoiceMuted ? "volume-off" : "volume-high"}
                  iconColor="white"
                  size={28}
                  onPress={toggleVoice}
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                />
                <IconButton 
                  icon="tune"
                  iconColor="white"
                  size={28}
                  onPress={toggleSliders}
                  style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
                />
              </View>
            </View>

            <View style={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 16,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 20,
              paddingBottom: isLandscape ? 16 : 50,
              ...(isLandscape && { marginBottom: 8 })
            }}>
              <View style={{ 
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                gap: 8,
                paddingVertical: 4
              }}>
                <IconButton
                  icon="page-first"
                  iconColor="white"
                  size={28}
                  onPress={handleFirst}
                  disabled={currentSlide === 0}
                />
                <IconButton
                  icon="skip-previous"
                  iconColor="white"
                  size={28}
                  onPress={handlePrevious}
                  disabled={currentSlide === 0}
                />
                <IconButton
                  icon={isPlaying ? "pause" : "play"}
                  iconColor="white"
                  size={32}
                  onPress={togglePlayPause}
                />
                <IconButton
                  icon="skip-next"
                  iconColor="white"
                  size={28}
                  onPress={handleNext}
                  disabled={currentSlide === slides.length - 1}
                />
                <IconButton
                  icon="page-last"
                  iconColor="white"
                  size={28}
                  onPress={handleLast}
                  disabled={currentSlide === slides.length - 1}
                />
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Styles for the components
const styles = StyleSheet.create({
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  filledTrack: {
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    left: 0,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    left: -12, // Half the width to center
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 24,
  }
});