"use client"

import React, { useState, useEffect } from "react"
import { StyleSheet, View, ScrollView, Pressable } from "react-native"
import { Text, Card, IconButton, FAB, Menu, Portal, Dialog, Button, TextInput } from "react-native-paper"
import { router, useFocusEffect } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import AsyncStorage from "@react-native-async-storage/async-storage"
import type { Slide } from "../utils/excelProcessor"

interface SavedSlideSet {
  id: string
  name: string
  content: Slide[]
  createdAt: string
}

interface Group {
  id: string
  name: string
  slides: SavedSlideSet[]
  createdAt: string
  isFavorite?: boolean
}

interface RenameDialogProps {
  visible: boolean
  initialName: string
  onDismiss: () => void
  onRename: (newName: string) => void
}

const RenameDialog: React.FC<RenameDialogProps> = ({ visible, initialName, onDismiss, onRename }) => {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    if (visible) {
      setName(initialName)
    }
  }, [visible, initialName])

  return (
    <Dialog visible={visible} onDismiss={onDismiss} dismissable={false}>
      <Dialog.Title>Rename Slide Set</Dialog.Title>
      <Dialog.Content>
        <TextInput
          label="New Name"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          autoFocus
          blurOnSubmit={false}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="default"
          returnKeyType="done"
          enablesReturnKeyAutomatically={true}
          onSubmitEditing={() => name.trim() && onRename(name.trim())}
        />
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Cancel</Button>
        <Button onPress={() => onRename(name.trim())} disabled={!name.trim()}>
          Save
        </Button>
      </Dialog.Actions>
    </Dialog>
  )
}

const SingleSlidesScreen = () => {
  const [slides, setSlides] = useState<SavedSlideSet[]>([])
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false)
  const [renameDialogVisible, setRenameDialogVisible] = useState(false)
  const [selectedSlide, setSelectedSlide] = useState<SavedSlideSet | null>(null)

  useEffect(() => {
    fetchSlides()
  }, [])

  const fetchSlides = async () => {
    try {
      const savedSlides = await AsyncStorage.getItem("singleSlides")
      if (savedSlides) {
        setSlides(JSON.parse(savedSlides))
      }
    } catch (error) {
      console.error("Error fetching slides:", error)
    }
  }

  const handleMenuPress = (slideId: string) => {
    setMenuVisible(slideId)
  }

  const handleMenuDismiss = () => {
    setMenuVisible(null)
  }

  const handleDelete = async () => {
    if (!selectedSlide) return

    try {
      const updatedSlides = slides.filter((slide) => slide.id !== selectedSlide.id)
      await AsyncStorage.setItem("singleSlides", JSON.stringify(updatedSlides))
      setSlides(updatedSlides)
      setDeleteDialogVisible(false)
      setSelectedSlide(null)
    } catch (error) {
      console.error("Error deleting slide:", error)
    }
  }

  const handleRenameDialogOpen = (slide: SavedSlideSet) => {
    setSelectedSlide(slide)
    setRenameDialogVisible(true)
  }

  const handleRenameDialogClose = () => {
    setRenameDialogVisible(false)
    setSelectedSlide(null)
  }

  const handleRename = async (newName: string) => {
    if (!selectedSlide) return

    try {
      const updatedSlides = slides.map((slide) => {
        if (slide.id === selectedSlide.id) {
          return { ...slide, name: newName }
        }
        return slide
      })
      await AsyncStorage.setItem("singleSlides", JSON.stringify(updatedSlides))
      setSlides(updatedSlides)
      handleRenameDialogClose()
    } catch (error) {
      console.error("Error renaming slide:", error)
    }
  }

  const handlePlay = (slideSet: SavedSlideSet) => {
    router.push({
      pathname: "/presentation",
      params: {
        slides: JSON.stringify(slideSet.content),
        isSingleSlide: "true",
      },
    })
  }

  const handleEdit = (slideSet: SavedSlideSet) => {
    router.push({
      pathname: "/preview",
      params: {
        slides: JSON.stringify(slideSet.content),
        isEditing: "true",
        slideSetId: slideSet.id,
        slideName: slideSet.name,
      },
    })
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {slides.length > 0 ? (
          slides.map((slideSet) => (
            <Card key={slideSet.id} style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.slideInfo}>
                  <Text style={styles.slideName}>{slideSet.name}</Text>
                  <Text style={styles.slideCount}>{slideSet.content.length} slides</Text>
                </View>
                <View style={styles.cardActions}>
                  <IconButton
                    icon="play"
                    onPress={() => handlePlay(slideSet)}
                    iconColor="#4CAF50"
                    style={styles.playButton}
                  />
                  <Menu
                    visible={menuVisible === slideSet.id}
                    onDismiss={handleMenuDismiss}
                    anchor={<IconButton icon="dots-vertical" onPress={() => handleMenuPress(slideSet.id)} />}
                  >
                    <Menu.Item
                      onPress={() => {
                        handleMenuDismiss()
                        handleRenameDialogOpen(slideSet)
                      }}
                      title="Rename"
                      leadingIcon="pencil-outline"
                    />
                    <Menu.Item
                      onPress={() => {
                        handleMenuDismiss()
                        handleEdit(slideSet)
                      }}
                      title="Edit"
                      leadingIcon="pencil"
                    />
                    <Menu.Item
                      onPress={() => {
                        handleMenuDismiss()
                        setSelectedSlide(slideSet)
                        setDeleteDialogVisible(true)
                      }}
                      title="Delete"
                      leadingIcon="delete"
                    />
                  </Menu>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No slides found</Text>
            <Text style={styles.emptyStateSubtext}>Add slides by tapping the + button</Text>
          </View>
        )}
      </ScrollView>
      <FAB icon="plus" style={styles.fab} onPress={() => router.push("/upload")} />
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Slide Set</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this slide set?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDelete} textColor="red">
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>

        <RenameDialog
          visible={renameDialogVisible}
          initialName={selectedSlide?.name || ""}
          onDismiss={handleRenameDialogClose}
          onRename={handleRename}
        />
      </Portal>
    </View>
  )
}

const GroupedSlidesScreen = () => {
  const [groups, setGroups] = useState<Group[]>([])
  const [menuVisible, setMenuVisible] = useState<string | null>(null)
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  useEffect(() => {
    fetchGroups()
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      fetchGroups()
    }, []),
  )

  const fetchGroups = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem("slideGroups")
      if (savedGroups) {
        setGroups(JSON.parse(savedGroups))
      }
    } catch (error) {
      console.error("Error fetching groups:", error)
    }
  }

  const handleMenuPress = (groupId: string) => {
    setMenuVisible(groupId)
  }

  const handleMenuDismiss = () => {
    setMenuVisible(null)
  }

  const handleDelete = async () => {
    if (!selectedGroup) return

    try {
      const updatedGroups = groups.filter((group) => group.id !== selectedGroup.id)
      await AsyncStorage.setItem("slideGroups", JSON.stringify(updatedGroups))
      setGroups(updatedGroups)
      setDeleteDialogVisible(false)
      setSelectedGroup(null)
    } catch (error) {
      console.error("Error deleting group:", error)
    }
  }

  const handlePlay = (group: Group) => {
    const allSlides = group.slides.reduce((acc, slideSet) => [...acc, ...slideSet.content], [] as Slide[])
    router.push({
      pathname: "/presentation",
      params: {
        slides: JSON.stringify(allSlides),
        isSingleSlide: "false",
      },
    })
  }

  const handleGroupPress = (group: Group) => {
    router.push({
      pathname: "/group-details",
      params: { groupId: group.id },
    })
  }

  const toggleFavorite = async (groupId: string) => {
    try {
      const updatedGroups = groups.map((group) => {
        if (group.id === groupId) {
          return { ...group, isFavorite: !group.isFavorite }
        }
        return group
      })
      await AsyncStorage.setItem("slideGroups", JSON.stringify(updatedGroups))
      setGroups(updatedGroups)
    } catch (error) {
      console.error("Error toggling favorite:", error)
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {groups.length > 0 ? (
          groups.map((group) => (
            <Card key={group.id} style={styles.card} onPress={() => handleGroupPress(group)}>
              <Card.Content style={styles.cardContent}>
                <IconButton
                  icon={group.isFavorite ? "star" : "star-outline"}
                  iconColor={group.isFavorite ? "#FFD700" : "#666"}
                  onPress={(e) => {
                    e.stopPropagation()
                    toggleFavorite(group.id)
                  }}
                />
                <View style={styles.slideInfo}>
                  <Text variant="titleMedium" style={styles.slideName}>
                    {group.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.slideCount}>
                    {group.slides.reduce((total, slideSet) => total + slideSet.content.length, 0)} slides
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <IconButton
                    icon="play"
                    onPress={(e) => {
                      e.stopPropagation()
                      handlePlay(group)
                    }}
                    iconColor="#4CAF50"
                  />
                  <Menu
                    visible={menuVisible === group.id}
                    onDismiss={handleMenuDismiss}
                    anchor={
                      <IconButton
                        icon="dots-vertical"
                        onPress={(e) => {
                          e.stopPropagation()
                          handleMenuPress(group.id)
                        }}
                      />
                    }
                  >
                    <Menu.Item
                      onPress={() => {
                        handleMenuDismiss()
                        setSelectedGroup(group)
                        setDeleteDialogVisible(true)
                      }}
                      title="Delete"
                      leadingIcon="delete"
                    />
                  </Menu>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No groups found</Text>
            <Text style={styles.emptyStateSubtext}>Create groups from your slides</Text>
          </View>
        )}
      </ScrollView>
      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Group</Dialog.Title>
          <Dialog.Content>
            <Text>Are you sure you want to delete this group?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleDelete} textColor="red">
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const FavoritesScreen = () => {
  const [favorites, setFavorites] = useState<Group[]>([])

  useEffect(() => {
    fetchFavorites()
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      fetchFavorites()
    }, []),
  )

  const fetchFavorites = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem("slideGroups")
      if (savedGroups) {
        const allGroups = JSON.parse(savedGroups)
        setFavorites(allGroups.filter((group: Group) => group.isFavorite))
      }
    } catch (error) {
      console.error("Error fetching favorites:", error)
    }
  }

  const handleGroupPress = (group: Group) => {
    router.push({
      pathname: "/group-details",
      params: { groupId: group.id },
    })
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {favorites.length > 0 ? (
          favorites.map((favorite) => (
            <Card key={favorite.id} style={styles.card} onPress={() => handleGroupPress(favorite)}>
              <Card.Content style={styles.cardContent}>
                <IconButton icon="star" iconColor="#FFD700" />
                <View style={styles.slideInfo}>
                  <Text style={styles.slideName}>{favorite.name}</Text>
                  <Text style={styles.slideCount}>
                    {favorite.slides.reduce((total, slideSet) => total + slideSet.content.length, 0)} slides
                  </Text>
                </View>
              </Card.Content>
            </Card>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No favorites found</Text>
            <Text style={styles.emptyStateSubtext}>Star groups to add them to favorites</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default function MySlidesScreen() {
  const [activeTab, setActiveTab] = useState<"Single" | "Grouped" | "Favorites">("Single")

  // Render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "Single":
        return <SingleSlidesScreen />
      case "Grouped":
        return <GroupedSlidesScreen />
      case "Favorites":
        return <FavoritesScreen />
      default:
        return <SingleSlidesScreen />
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Custom Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabItem, activeTab === "Single" && styles.activeTabItem]}
          onPress={() => setActiveTab("Single")}
        >
          <Text style={[styles.tabText, activeTab === "Single" && styles.activeTabText]}>Single</Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, activeTab === "Grouped" && styles.activeTabItem]}
          onPress={() => setActiveTab("Grouped")}
        >
          <Text style={[styles.tabText, activeTab === "Grouped" && styles.activeTabText]}>Grouped</Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, activeTab === "Favorites" && styles.activeTabItem]}
          onPress={() => setActiveTab("Favorites")}
        >
          <Text style={[styles.tabText, activeTab === "Favorites" && styles.activeTabText]}>Favorites</Text>
        </Pressable>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>{renderTabContent()}</View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  // Custom Tab Bar Styles
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  activeTabItem: {
    borderBottomWidth: 2,
    borderBottomColor: "#4CAF50",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
  },
  activeTabText: {
    color: "#4CAF50",
    fontWeight: "500",
  },
  tabContent: {
    flex: 1,
  },
  // Existing styles
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: "#fff",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  slideInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  slideName: {
    fontSize: 16,
    color: "#000",
    textTransform: "capitalize",
  },
  slideCount: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  playButton: {
    marginRight: -8,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: "#4CAF50",
  },
  input: {
    marginBottom: 16,
  },
  // Empty state styles
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
})

