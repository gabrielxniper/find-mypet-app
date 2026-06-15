import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../hooks/useTheme';
import { PetShare, SharePermission } from '../../models/pet.model';
import { PetStackParamList } from '../../navigation/types';
import { ShareService } from '../../services/ShareService';
import { Colors } from '../styles/color';

type RouteProps = RouteProp<PetStackParamList, 'PetShare'>;
type NavProps = NativeStackNavigationProp<PetStackParamList, 'PetShare'>;

export default function PetShareScreen() {
    const navigation = useNavigation<NavProps>();
    const route = useRoute<RouteProps>();
    const { petId, petNome } = route.params;

    const { darkMode } = useTheme();
    const theme = darkMode ? Colors.dark : Colors.light;

    const [shares, setShares] = useState<PetShare[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [email, setEmail] = useState('');
    const [permission, setPermission] = useState<SharePermission>('VIEW');

    const carregarShares = useCallback(async () => {
        setIsLoading(true);
        try {
            const resp: any = await ShareService.listShares(petId);
            setShares(Array.isArray(resp) ? resp : (resp?.data || []));
        } catch (err) { console.warn('[PetShare] Erro ao carregar compartilhamentos:', err); }
        finally { setIsLoading(false); }
    }, [petId]);

    useEffect(() => { carregarShares(); }, [carregarShares]);

    async function handleCompartilhar() {
        if (!email.trim()) { Alert.alert('Erro', 'Informe o email para compartilhar.'); return; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { Alert.alert('Erro', 'Informe um email válido.'); return; }

        setIsSaving(true);
        try {
            await ShareService.sharePet(petId, email.trim().toLowerCase(), permission);
            setEmail('');
            await carregarShares();
        } catch (err: any) {
            Alert.alert('Erro', err?.message || 'Não foi possível compartilhar.');
        } finally { setIsSaving(false); }
    }

    async function handleRemover(share: PetShare) {
        Alert.alert('Remover acesso', `Remover acesso de ${share.shared_with_email ?? 'este usuário'}?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Remover', style: 'destructive',
                onPress: async () => {
                    try { await ShareService.removeShare(petId, share.id); await carregarShares(); }
                    catch { Alert.alert('Erro', 'Não foi possível remover o acesso.'); }
                }
            }
        ]);
    }

    async function handleAlterarPermissao(share: PetShare) {
        const nova: SharePermission = share.permission === 'VIEW' ? 'EDIT' : 'VIEW';
        try { await ShareService.updatePermission(petId, share.id, nova); await carregarShares(); }
        catch { Alert.alert('Erro', 'Não foi possível alterar a permissão.'); }
    }

    const display = (share: PetShare) => share.shared_with_email ?? share.shared_with_user_id;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
                <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn} hitSlop={8}>
                    <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
                </Pressable>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                    Compartilhar {petNome}
                </Text>
                <View style={styles.iconBtn} />
            </View>

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <FlatList
                    data={shares}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <>
                            {/* Formulário */}
                            <View style={[styles.card, { backgroundColor: theme.surface }]}>
                                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Adicionar acesso</Text>
                                <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
                                    Informe o email da conta que terá acesso a este pet.
                                </Text>

                                <TextInput
                                    style={[styles.input, { borderColor: theme.border, backgroundColor: theme.background, color: theme.textPrimary }]}
                                    placeholder="email@exemplo.com"
                                    placeholderTextColor={theme.textSecondary}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    value={email}
                                    onChangeText={setEmail}
                                />

                                <Text style={[styles.permLabel, { color: theme.textSecondary }]}>Permissão</Text>
                                <View style={styles.permRow}>
                                    {(['VIEW', 'EDIT'] as SharePermission[]).map((p) => (
                                        <Pressable
                                            key={p}
                                            style={[
                                                styles.permChip,
                                                { borderColor: theme.border },
                                                permission === p && { backgroundColor: Colors.brand.primaryBlue, borderColor: Colors.brand.primaryBlue }
                                            ]}
                                            onPress={() => setPermission(p)}
                                        >
                                            <Text style={[
                                                styles.permChipText,
                                                { color: theme.textSecondary },
                                                permission === p && { color: '#fff' }
                                            ]}>
                                                {p === 'VIEW' ? 'Visualizar' : 'Editar'}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>

                                <Pressable
                                    style={({ pressed }) => [styles.btnShare, { opacity: pressed || isSaving ? 0.75 : 1 }]}
                                    onPress={handleCompartilhar}
                                    disabled={isSaving}
                                >
                                    {isSaving
                                        ? <ActivityIndicator color="#fff" size="small" />
                                        : <>
                                            <Ionicons name="person-add-outline" size={16} color="#fff" />
                                            <Text style={styles.btnShareText}>Compartilhar</Text>
                                        </>
                                    }
                                </Pressable>
                            </View>

                            {/* Título da lista */}
                            <View style={styles.listHeadRow}>
                                <Text style={[styles.listHead, { color: theme.textPrimary }]}>Quem tem acesso</Text>
                                {isLoading && <ActivityIndicator size="small" color={Colors.brand.primaryBlue} />}
                            </View>
                        </>
                    }
                    renderItem={({ item }) => (
                        <View style={[styles.shareItem, { backgroundColor: theme.surface }]}>
                            <View style={[styles.avatar, { backgroundColor: Colors.brand.primaryBlue + '18' }]}>
                                <Text style={[styles.avatarLetter, { color: Colors.brand.primaryBlue }]}>
                                    {display(item)[0].toUpperCase()}
                                </Text>
                            </View>

                            <View style={styles.shareInfo}>
                                <Text style={[styles.shareEmail, { color: theme.textPrimary }]} numberOfLines={1}>
                                    {display(item)}
                                </Text>
                                <Pressable onPress={() => handleAlterarPermissao(item)} hitSlop={6}>
                                    <View style={[
                                        styles.permTag,
                                        { backgroundColor: item.permission === 'EDIT' ? '#FFF4E8' : '#EEF3FF' }
                                    ]}>
                                        <Text style={[
                                            styles.permTagText,
                                            { color: item.permission === 'EDIT' ? Colors.brand.primaryOrange : Colors.brand.primaryBlue }
                                        ]}>
                                            {item.permission === 'EDIT' ? 'Pode editar' : 'Visualização'} · alterar
                                        </Text>
                                    </View>
                                </Pressable>
                            </View>

                            <Pressable
                                style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.5 : 1 }]}
                                onPress={() => handleRemover(item)}
                                hitSlop={10}
                            >
                                <Ionicons name="close" size={18} color={theme.textSecondary} />
                            </Pressable>
                        </View>
                    )}
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={[styles.emptyBox, { backgroundColor: theme.surface }]}>
                                <Ionicons name="people-outline" size={32} color={theme.border} />
                                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                                    Nenhum compartilhamento ainda
                                </Text>
                            </View>
                        ) : null
                    }
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    header: {
        height: 56,
        paddingHorizontal: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
    },

    headerTitle: {
        fontSize: 17,
        fontFamily: 'Inter-Bold',
        flex: 1,
        textAlign: 'center',
        letterSpacing: -0.2,
    },

    iconBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },

    list: {
        padding: 20,
        gap: 10,
        paddingBottom: 40,
    },

    card: {
        borderRadius: 18,
        padding: 18,
        gap: 12,
        marginBottom: 4,
    },

    cardTitle: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        letterSpacing: -0.2,
    },

    cardSub: {
        fontSize: 13,
        fontFamily: 'Inter-Regular',
        lineHeight: 18,
        marginTop: -4,
    },

    input: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        fontFamily: 'Inter-Regular',
    },

    permLabel: {
        fontSize: 11,
        fontFamily: 'Inter-Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },

    permRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: -4,
    },

    permChip: {
        flex: 1,
        paddingVertical: 11,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },

    permChipText: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
    },

    btnShare: {
        backgroundColor: Colors.brand.primaryOrange,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 2,
    },

    btnShareText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: 'Inter-Bold',
    },

    listHeadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
        marginBottom: 2,
    },

    listHead: {
        fontSize: 15,
        fontFamily: 'Inter-Bold',
    },

    shareItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        padding: 14,
        borderRadius: 16,
    },

    avatar: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },

    avatarLetter: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
    },

    shareInfo: {
        flex: 1,
        gap: 5,
    },

    shareEmail: {
        fontSize: 14,
        fontFamily: 'Inter-Bold',
    },

    permTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 8,
    },

    permTagText: {
        fontSize: 11,
        fontFamily: 'Inter-Bold',
    },

    removeBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },

    emptyBox: {
        borderRadius: 16,
        paddingVertical: 28,
        alignItems: 'center',
        gap: 8,
    },

    emptyText: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
    },
});
