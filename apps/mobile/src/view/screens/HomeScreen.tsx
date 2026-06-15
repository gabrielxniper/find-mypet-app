import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import { PetHomeType, formatUpdatedAt, useHomeViewModel } from '../../viewmodels/useHomeViewModel';
import { Colors } from '../styles/color';

const DARK_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
    { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d70' }] },
];

function PetMarker({ pet, isSelected }: { pet: PetHomeType; isSelected: boolean }) {
    const isOnline = pet.status === 'ONLINE';
    const borderColor = isSelected
        ? Colors.brand.primaryOrange
        : isOnline
        ? Colors.brand.primaryBlue
        : '#94a3b8';
    const size = isSelected ? 54 : 42;
    // Descontamos os 3px de borda de cada lado para a imagem preencher corretamente
    const imgSize = size - 6;

    return (
        <View  pointerEvents="none">
             <View style={[markerStyles.callout, { backgroundColor: borderColor }]}>
                    <Ionicons name="paw" color="white" style={{ marginRight: 3 }} />
                    <Text style={markerStyles.calloutText} numberOfLines={1}>
                        {pet.nome}
                    </Text>
                </View>
        </View>
    );
}
function SmallBatteryIndicator({ level }: { level?: number | null }) {
    const { darkMode } = useTheme();
    const theme = darkMode ? Colors.dark : Colors.light;
    if (level === undefined || level === null) {
        return (
            <View style={[styles.smallBattery, { backgroundColor: darkMode ? '#ffffff10' : '#00000008' }]}>
                <Ionicons name="battery-dead-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.smallBatteryText, { color: theme.textSecondary }]}>
                    --%
                </Text>
            </View>
        );
    }

    let iconName: keyof typeof Ionicons.glyphMap = "battery-full";
    let color = "#22c55e";

    if (level <= 20) {
        iconName = "battery-dead";
        color = "#ef4444"; 
    } else if (level <= 60) {
        iconName = "battery-half";
        color = "#f59e0b"; 
    }

    return (
        <View style={[styles.smallBattery, { backgroundColor: darkMode ? '#ffffff10' : '#00000008' }]}>
            <Ionicons name={iconName} size={14} color={color} />
            <Text style={[styles.smallBatteryText, { color: theme.textSecondary }]}>
                {level}%
            </Text>
        </View>
    );
}
export default function HomeScreen() {
    const { darkMode } = useTheme();
    const insets = useSafeAreaInsets();
    const [panelOpen, setPanelOpen] = useState(true);
    const isFocused = useIsFocused();
    const { pets, safeZones, unreadCount, isLoading, carregarPets, selectedPetId, selectPet, mapRegion, mapRef } =
        useHomeViewModel();

    useFocusEffect(
        useCallback(() => {
            carregarPets();
        }, [carregarPets])
    );

    const handlePetPress = useCallback(
        (pet: PetHomeType) => {
            selectPet(pet.id);
        },
        [selectPet]
    );

    return (
        <View style={styles.root}>
            {/* MAP — desmonta quando a aba Home não está em foco para evitar múltiplos MapViews simultâneos */}
            {isFocused && (
                <MapView
                    ref={mapRef}
                    style={StyleSheet.absoluteFillObject}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    initialRegion={mapRegion}
                    showsUserLocation
                    showsMyLocationButton={false}
                    showsCompass={false}
                    customMapStyle={darkMode ? DARK_MAP_STYLE : []}
                >
                    {safeZones
                        .filter(z => z.is_active)
                        .map(zone => (
                            <Circle
                                key={zone.id}
                                center={{ latitude: zone.latitude, longitude: zone.longitude }}
                                radius={zone.radius_meters}
                                strokeColor={Colors.brand.primaryBlue + '90'}
                                fillColor={Colors.brand.primaryBlue + '18'}
                                strokeWidth={1.5}
                            />
                        ))}

                    {pets
                        .filter((p) => p.latitude != null && p.longitude != null)
                        .map((pet) => (
                            <Marker
                                key={pet.id}
                                coordinate={{ latitude: pet.latitude!, longitude: pet.longitude! }}
                                onPress={() => handlePetPress(pet)}
                                tracksViewChanges={selectedPetId === pet.id}
                                anchor={{ x: 0.5, y: 1 }}
                            >
                                <PetMarker pet={pet} isSelected={selectedPetId === pet.id} />
                            </Marker>
                        ))}
                </MapView>
            )}

            <View style={[styles.headerSafe, { top: insets.top }]} pointerEvents="box-none">
                <View style={[styles.header, darkMode && styles.headerDark]}>
                    <View>
                        <Text
                            style={[
                                styles.headerSub,
                                darkMode && { color: Colors.dark.textSecondary },
                            ]}
                        >
                            Find My
                        </Text>
                        <Text style={styles.headerTitle}>PET</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={[styles.countBadge, darkMode && styles.countBadgeDark]}>
                            <Ionicons name="paw" size={12} color={Colors.brand.primaryOrange} />
                            <Text
                                style={[styles.countText, darkMode && { color: Colors.dark.textSecondary }]}
                            >
                                {pets.length} {pets.length === 1 ? 'pet' : 'pets'}
                            </Text>
                        </View>

                        {/* Badge de alertas */}
                        {unreadCount > 0 && (
                            <View style={styles.alertBtnWrap}>
                                <TouchableOpacity
                                    style={[styles.refreshBtn, darkMode && styles.refreshBtnDark]}
                                    onPress={carregarPets}
                                >
                                    <Ionicons name="warning-outline" size={20} color="#EF4444" />
                                </TouchableOpacity>
                                <View style={styles.alertDot}>
                                    <Text style={styles.alertDotText}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={carregarPets}
                            style={[styles.refreshBtn, darkMode && styles.refreshBtnDark]}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color={Colors.brand.primaryBlue} />
                            ) : (
                                <Ionicons
                                    name="refresh-outline"
                                    size={20}
                                    color={Colors.brand.primaryBlue}
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* BOTTOM PANEL */}
            <View style={styles.bottomSafe} pointerEvents="box-none">
                <View
                    style={[styles.bottomPanel, darkMode && styles.bottomPanelDark]}
                    pointerEvents="auto"
                >
                    <TouchableOpacity
                        onPress={() => setPanelOpen(o => !o)}
                        activeOpacity={0.7}
                        style={styles.handleTouchable}
                    >
                        <View style={styles.handleBar} />
                        <View style={styles.panelHeaderRow}>
                            <Text style={[styles.panelTitle, darkMode && { color: Colors.dark.textPrimary }]}>
                                Rastreamento
                            </Text>
                            <Ionicons
                                name={panelOpen ? 'chevron-down' : 'chevron-up'}
                                size={18}
                                color={darkMode ? Colors.dark.textSecondary : Colors.light.textSecondary}
                            />
                        </View>
                    </TouchableOpacity>

                    {panelOpen && isLoading ? (
                        <View style={styles.loaderRow}>
                            <ActivityIndicator size="small" color={Colors.brand.primaryBlue} />
                            <Text
                                style={[styles.loaderText, darkMode && { color: Colors.dark.textSecondary }]}
                            >
                                Buscando localização...
                            </Text>
                        </View>
                    ) : panelOpen ? (
                        <FlatList
                            horizontal
                            data={pets}
                            keyExtractor={(item) => item.id}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.cardList}
                            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                            renderItem={({ item }) => {
                                const isActive = selectedPetId === item.id;
                                const onlineColor = '#22c55e';
                                const offlineColor = '#94a3b8';
                                const statusColor =
                                    item.status === 'ONLINE' ? onlineColor : offlineColor;
                                const avatarColor =
                                    item.status === 'ONLINE'
                                        ? Colors.brand.primaryBlue
                                        : '#94a3b8';

                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.petCard,
                                            darkMode && styles.petCardDark,
                                            isActive && styles.petCardActive,
                                        ]}
                                        onPress={() => handlePetPress(item)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.cardTopRow}>
                                            <View
                                                style={[styles.avatar, { backgroundColor: avatarColor, overflow: 'hidden', marginBottom: 0 }]}
                                            >
                                                {item.foto ? (
                                                    <Image
                                                        source={{ uri: item.foto }}
                                                        style={{ width: '100%', height: '100%' }}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <Ionicons name="paw" size={24} color="white" />
                                                )}
                                            </View>
                                            {item.nomeColeira != null && (
                                                <SmallBatteryIndicator level={(item as any).batteryLevel} />
                                            )}
                                        </View>

                                        <Text
                                            style={[
                                                styles.cardName,
                                                darkMode && { color: Colors.dark.textPrimary },
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {item.nome}
                                        </Text>

                                        <View style={styles.statusRow}>
                                            <View
                                                style={[
                                                    styles.statusDot,
                                                    { backgroundColor: statusColor },
                                                ]}
                                            />
                                            <Text style={[styles.statusLabel, { color: statusColor }]}>
                                                {item.status === 'ONLINE'
                                                    ? 'Online'
                                                    : item.status === 'OFFLINE'
                                                    ? 'Offline'
                                                    : 'Sem coleira'}
                                            </Text>
                                        </View>

                                        {item.nomeColeira != null && (
                                            <View style={styles.deviceRow}>
                                                <Ionicons
                                                    name="hardware-chip-outline"
                                                    size={11}
                                                    color={
                                                        darkMode
                                                            ? Colors.dark.textSecondary
                                                            : Colors.light.textSecondary
                                                    }
                                                />
                                                <Text
                                                    style={[
                                                        styles.deviceText,
                                                        darkMode && {
                                                            color: Colors.dark.textSecondary,
                                                        },
                                                    ]}
                                                    numberOfLines={1}
                                                >
                                                    {item.nomeColeira}
                                                </Text>
                                            </View>
                                        )}

                                        <Text
                                            style={[
                                                styles.timeText,
                                                darkMode && { color: Colors.dark.textSecondary },
                                            ]}
                                        >
                                            {item.ultimaAtualizacao
                                                ? formatUpdatedAt(item.ultimaAtualizacao)
                                                : 'Sem localização'}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.emptyRow}>
                                    <Ionicons
                                        name="paw-outline"
                                        size={28}
                                        color={Colors.light.textSecondary}
                                    />
                                    <Text
                                        style={[
                                            styles.emptyText,
                                            darkMode && { color: Colors.dark.textSecondary },
                                        ]}
                                    >
                                        Nenhum pet cadastrado
                                    </Text>
                                </View>
                            }
                        />
                    ) : null}
                </View>
            </View>
        </View>
    );
}

const markerStyles = StyleSheet.create({
    callout: {
        alignItems: 'center',
        borderRadius: 12,
        padding: 5,
        maxWidth: 400,
    },
    calloutText: {
        color: 'white',
        fontSize: 11,
        fontFamily: 'Inter-Bold',
        flexShrink: 1,
    },
    pin: {
        position: 'absolute',
        top: 0,
        left: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        backgroundColor: Colors.brand.primaryBlue,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 13,
        height: 13,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: 'white',
    },
    pinLarge: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    tail: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 9,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -1,
    },
});

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.light.background,
    },

    // FLOATING HEADER
    headerSafe: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 16,
    },
    header: {
        backgroundColor: 'white',
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
    },
    headerDark: {
        backgroundColor: Colors.dark.surface,
    },
    headerSub: {
        fontSize: 8.5,
        fontFamily: 'Inter-Regular',
        color: Colors.light.textSecondary,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    headerTitle: {
        fontSize: 30,
        fontFamily: 'Inter-Black',
        color: Colors.brand.primaryBlue,
        marginTop: -8,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    countBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.light.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 5,
    },
    countBadgeDark: {
        backgroundColor: Colors.dark.background,
    },
    countText: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: Colors.light.textSecondary,
    },
    refreshBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: Colors.light.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    refreshBtnDark: {
        backgroundColor: Colors.dark.background,
    },
    alertBtnWrap: {
        position: 'relative',
    },
    alertDot: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    alertDotText: {
        fontSize: 9,
        fontFamily: 'Inter-Bold',
        color: '#fff',
    },

    bottomSafe: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    bottomPanel: {
        backgroundColor: Colors.light.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 12,
        paddingBottom: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 12,
    },
    bottomPanelDark: {
        backgroundColor: Colors.dark.surface,
    },
    handleTouchable: {
        paddingBottom: 4,
    },
    handleBar: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.light.border,
        alignSelf: 'center',
        marginBottom: 10,
    },
    panelHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 14,
    },
    panelTitle: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: Colors.light.textPrimary,
    },

    loaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 10,
    },
    loaderText: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: Colors.light.textSecondary,
    },
    cardList: {
        paddingHorizontal: 16,
        paddingBottom: 4,
    },
    petCard: {
        width: 136,
        backgroundColor: Colors.light.background,
        borderRadius: 18,
        padding: 14,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    petCardDark: {
        backgroundColor: Colors.dark.background,
    },
    petCardActive: {
        borderColor: Colors.brand.primaryBlue,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    cardName: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
        color: Colors.light.textPrimary,
        marginBottom: 5,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 6,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    statusLabel: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
    },
    deviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    deviceText: {
        fontSize: 11,
        fontFamily: 'Inter-Regular',
        color: Colors.light.textSecondary,
        flexShrink: 1,
    },
    timeText: {
        fontSize: 10,
        fontFamily: 'Inter-Regular',
        color: Colors.light.textSecondary,
    },

    emptyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingBottom: 8,
        gap: 10,
    },
    emptyText: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: Colors.light.textSecondary,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
        gap: 5
    },
    smallBattery: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 3,
    },
    smallBatteryText: {
        fontSize: 10,
        fontFamily: 'Inter-Bold',
    },
});
