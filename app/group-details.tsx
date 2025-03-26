import { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, Card, IconButton, Menu, Portal, Dialog, Button } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Slide } from '../utils/excelProcessor';

interface SlideSet {
  id: string;
  name: string;
  content: Slide[];
  createdAt: string;
}

interface Group {
  id: string;
  name: string;
  slides: SlideSet[];
  createdAt: string;
  isFavorite?: boolean;
}

export default function GroupDetailsScreen() {
  const params = useLocalSearchParams();
  const [group, setGroup] = useState<Group | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    if (params.groupId) {
      fetchGroupDetails(params.groupId as string);
    }
  }, [params.groupId]);

  const fetchGroupDetails = async (groupId: string) => {
    try {
      const savedGroups = await AsyncStorage.getItem('slideGroups');
      if (savedGroups) {
        const groups = JSON.parse(savedGroups);
        const foundGroup = groups.find((g: Group) => g.id === groupId);
        if (foundGroup) {
          setGroup(foundGroup);
        }
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
    }
  };

  const handleMenuPress = () => {
    setMenuVisible(true);
  };

  const handleMenuDismiss = () => {
    setMenuVisible(false);
  };

  const handleDelete = async () => {
    if (!group) return;
    
    try {
      const savedGroups = await AsyncStorage.getItem('slideGroups');
      if (savedGroups) {
        const groups = JSON.parse(savedGroups);
        const updatedGroups = groups.filter((g: Group) => g.id !== group.id);
        await AsyncStorage.setItem('slideGroups', JSON.stringify(updatedGroups));
        router.back();
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const handlePlay = () => {
    if (group) {
      // Combine all slides from all sets in the group
      const allSlides = group.slides.reduce((acc, slideSet) => [...acc, ...slideSet.content], [] as Slide[]);
      router.push({
        pathname: '/presentation',
        params: { 
          slides: JSON.stringify(allSlides),
          isSingleSlide: 'false'
        }
      });
    }
  };

  const toggleFavorite = async () => {
    if (!group) return;
    
    try {
      const savedGroups = await AsyncStorage.getItem('slideGroups');
      if (savedGroups) {
        const groups = JSON.parse(savedGroups);
        const updatedGroups = groups.map((g: Group) => {
          if (g.id === group.id) {
            return { ...g, isFavorite: !g.isFavorite };
          }
          return g;
        });
        await AsyncStorage.setItem('slideGroups', JSON.stringify(updatedGroups));
        setGroup(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <IconButton
            icon={group.isFavorite ? 'star' : 'star-outline'}
            iconColor={group.isFavorite ? '#FFD700' : '#666'}
            onPress={toggleFavorite}
          />
          <Text variant="titleLarge" style={styles.groupName}>
            {group.name}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon="play"
            onPress={handlePlay}
            iconColor="#4CAF50"
          />
          <Menu
            visible={menuVisible}
            onDismiss={handleMenuDismiss}
            anchor={
              <IconButton
                icon="dots-vertical"
                onPress={handleMenuPress}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                handleMenuDismiss();
                setDeleteDialogVisible(true);
              }}
              title="Delete Group"
              leadingIcon="delete"
            />
          </Menu>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {group.slides.map((slideSet, index) => (
          <Card key={slideSet.id} style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.slideSetInfo}>
                <Text variant="titleMedium" style={styles.slideName}>
                  {slideSet.name}
                </Text>
                <Text variant="bodySmall" style={styles.slideCount}>
                  {slideSet.content.length} slides
                </Text>
              </View>
              <View style={styles.cardActions}>
                <IconButton
                  icon="play"
                  onPress={() => {
                    router.push({
                      pathname: '/presentation',
                      params: { 
                        slides: JSON.stringify(slideSet.content),
                        isSingleSlide: 'false'
                      }
                    });
                  }}
                  iconColor="#4CAF50"
                />
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Group</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this group?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDelete} textColor="red">Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupName: {
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slideSetInfo: {
    flex: 1,
  },
  slideName: {
    marginLeft: 8,
  },
  slideCount: {
    marginLeft: 8,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
  },
}); 