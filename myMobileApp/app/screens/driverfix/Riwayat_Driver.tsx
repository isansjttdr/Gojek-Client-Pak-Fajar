import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../hooks/supabaseClient";

type HistoryItem = {
  id: string;
  type: "ScootRide" | "ScootFood" | "ScootSend";
  pickup: string;
  destination: string;
  date: string;
  price: string;
  status: string;
  rawTimestamp: string; // used for filtering
};

const Riwayat_Driver: React.FC = () => {
  const router = useRouter();
  const { nama, nim, email, jenisMotor, plat, userId } = useLocalSearchParams();

  // params to pass
  const userParams = {
    nama: nama || '',
    nim: nim || '',
    email: email || '',
    jenisMotor: jenisMotor || '',
    plat: plat || '',
    userId: userId || ''
  };

  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<HistoryItem[]>([]);
  const [filter, setFilter] = React.useState<'all'|'week'|'month'>('all');

  // derive driverId from params (userId) - expect UUID or nim
  const driverIdParam = String(userId || '');

  React.useEffect(() => {
    const fetchAll = async () => {
      if (!driverIdParam) return;
      setLoading(true);
      try {
        // fetch from three tables in parallel (only status = 'done')
        const [rideRes, foodRes, sendRes] = await Promise.all([
          supabase.from('scoot_ride').select('*').eq('id_driver', driverIdParam).eq('status', 'done'),
          supabase.from('scoot_food').select('*').eq('id_driver', driverIdParam).eq('status', 'done'),
          supabase.from('scoot_send').select('*').eq('id_driver', driverIdParam).eq('status', 'done')
        ]);

        const normalize = (rows: any[] | null, kind: HistoryItem['type']): HistoryItem[] => {
          if (!rows) return [];
          return (rows || []).map((r: any) => {
            // try to find timestamp field
            const ts = r.timestamp ?? r.created_at ?? r.tanggal ?? r.updated_at ?? r.date ?? null;
            const dateStr = ts ? new Date(ts).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            // pickup / destination heuristics
            const pickup = r.lokasi_awal ?? r.lokasi_resto ?? r.pickup ?? r.origin ?? r.dari ?? '-';
            const destination = r.lokasi_tujuan ?? r.tujuan ?? r.destination ?? r.keterangan ?? '-';
            // price heuristics
            const price = (r.harga ?? r.ongkir ?? r.price ?? r.biaya ?? 0);
            const priceStr = typeof price === 'number' ? `Rp ${price.toLocaleString('id-ID')}` : String(price || '-');
            const status = r.status ?? r.order_status ?? '';
            const idKey = r.id_scoot_ride ?? r.id_scoot_food ?? r.id_scoot_send ?? r.id ?? Math.random().toString(36).slice(2,9);
            return {
              id: `${kind}-${idKey}`,
              type: kind,
              pickup,
              destination,
              date: dateStr,
              price: priceStr,
              status,
              rawTimestamp: ts ? new Date(ts).toISOString() : new Date(0).toISOString()
            } as HistoryItem;
          });
        };

        const rides = normalize(rideRes.data as any[] || [], 'ScootRide');
        const foods = normalize(foodRes.data as any[] || [], 'ScootFood');
        const sends = normalize(sendRes.data as any[] || [], 'ScootSend');

        // combine and sort by timestamp desc
        const combined = [...rides, ...foods, ...sends].sort((a,b) => new Date(b.rawTimestamp).getTime() - new Date(a.rawTimestamp).getTime());
        setHistory(combined);
      } catch (err) {
        console.error('Error loading history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [driverIdParam]);

  // filtered list based on filter selection
  const filtered = React.useMemo(() => {
    if (filter === 'all') return history;
    const now = new Date();
    const start = new Date(now);
    if (filter === 'week') start.setDate(now.getDate() - 7);
    if (filter === 'month') start.setMonth(now.getMonth() - 1);
    return history.filter(h => new Date(h.rawTimestamp) >= start);
  }, [history, filter]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container}>
          <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color="#016837" />
            <Text style={{ marginTop: 12, color: '#666' }}>Memuat riwayat...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Filter Buttons */}
          <View style={{ paddingHorizontal: 20, marginTop: 20, marginBottom: 12, flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]} onPress={() => setFilter('all')}>
              <Text style={[styles.filterText, filter === 'all' && { fontWeight: '800' }]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterButton, filter === 'week' && styles.filterButtonActive]} onPress={() => setFilter('week')}>
              <Text style={[styles.filterText, filter === 'week' && { fontWeight: '800' }]}>1 Minggu</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.filterButton, filter === 'month' && styles.filterButtonActive]} onPress={() => setFilter('month')}>
              <Text style={[styles.filterText, filter === 'month' && { fontWeight: '800' }]}>1 Bulan</Text>
            </TouchableOpacity>
          </View>

          {/* History List */}
          <View style={styles.historyList}>
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Belum ada riwayat untuk filter ini</Text>
              </View>
            ) : (
              filtered.map((item) => (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.imageContainer}>
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>
                        {item.type === 'ScootRide' ? '🛵' : item.type === 'ScootFood' ? '🍽️' : '📦'}
                      </Text>
                    </View>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{item.type}</Text>
                    </View>
                  </View>

                  <View style={styles.detailsContainer}>
                    <View style={styles.locationRow}>
                      <View style={styles.dot} />
                      <Text style={styles.locationText}>{item.pickup}</Text>
                    </View>

                    <View style={styles.dividerLine} />

                    <View style={styles.locationRow}>
                      <View style={styles.dot} />
                      <Text style={styles.locationText}>{item.destination}</Text>
                    </View>

                    <Text style={styles.dateText}>{item.date}</Text>
                  </View>

                  <View style={styles.rightSection}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                    <Text style={styles.priceText}>{item.price}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.replace({
              pathname: '/screens/driverfix/HomeDriver',
              params: userParams
            })}
            activeOpacity={0.7}
          >
            <View style={styles.navIconContainer}>
              <View style={styles.homeIcon}>
                <View style={styles.homeIconBase} />
                <View style={styles.homeIconRoof} />
              </View>
            </View>
            <Text style={styles.navText}>Beranda</Text>
          </TouchableOpacity>

          <View style={[styles.navItem, styles.navItemActive]}>
            <View style={styles.navIconContainerActive}>
              <View style={styles.historyIcon}>
                <View style={styles.historyIconCircle} />
                <View style={styles.historyIconHand} />
              </View>
            </View>
            <Text style={styles.navTextActive}>Riwayat</Text>
          </View>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.replace({
              pathname: '/screens/driverfix/TermsAndConditionDriver',
              params: userParams
            })}
            activeOpacity={0.7}
          >
            <View style={styles.navIconContainer}>
              <View style={styles.termsIcon}>
                <View style={styles.termsIconPaper} />
                <View style={styles.termsIconLines} />
              </View>
            </View>
            <Text style={styles.navText}>Terms n Cond</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flex: 1 }, // added to fix missing styles.content reference
  scrollView: { flex: 1 },
  filterButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e6f6ee",
    borderRadius: 21,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 0,
  },
  filterButtonActive: {
    backgroundColor: "#33cc66",
  },
  filterText: { fontSize: 14, fontFamily: "Montserrat-Bold", fontWeight: "700", color: "#016837" },

  historyList: { paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
  historyCard: {
    backgroundColor: "#33cc66",
    borderRadius: 21,
    padding: 16,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#c4bfbf",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(1, 104, 55, 0.4)",
  },
  imageContainer: { alignItems: "center", gap: 6 },
  imagePlaceholder: { width: 92, height: 92, backgroundColor: "#fff", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  imagePlaceholderText: { fontSize: 40 },
  typeBadge: { backgroundColor: "#fff", borderRadius: 33, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { fontSize: 9, fontFamily: "Montserrat-Bold", fontWeight: "700", color: "#fe95a3", textAlign: "center" },

  detailsContainer: { flex: 1, justifyContent: "center", gap: 6 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#fff" },
  locationText: { fontSize: 11, fontFamily: "Montserrat-Bold", fontWeight: "700", color: "#fff", flexShrink: 1 },
  dividerLine: { height: 1, backgroundColor: "#fff", marginLeft: 15, width: "85%" },
  dateText: { fontSize: 11, fontFamily: "Montserrat-Bold", fontWeight: "700", color: "#fff", marginTop: 4 },

  rightSection: { alignItems: "flex-end", justifyContent: "space-between" },
  statusBadge: { backgroundColor: "#fe95a3", borderRadius: 33, paddingHorizontal: 16, paddingVertical: 6 },
  statusText: { fontSize: 11, fontFamily: "Montserrat-Bold", fontWeight: "700", color: "#fff", textAlign: "center" },
  priceText: { fontSize: 11, fontFamily: "Montserrat-Bold", fontWeight: "700", color: "#fff", textAlign: "right" },

  bottomNav: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  navItem: { alignItems: "center", flex: 1 },
  navItemActive: { backgroundColor: "#d2ffde", borderRadius: 18, paddingVertical: 8 },
  navIconContainer: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  navIconContainerActive: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  homeIcon: { width: 28, height: 28, position: "relative" },
  homeIconBase: { width: 22, height: 18, borderWidth: 2.5, borderColor: "#016837", borderTopWidth: 0, position: "absolute", bottom: 0, left: 3 },
  homeIconRoof: { width: 0, height: 0, borderLeftWidth: 14, borderRightWidth: 14, borderBottomWidth: 12, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#016837", position: "absolute", top: 0 },
  historyIcon: { width: 28, height: 28, position: "relative" },
  historyIconCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, borderColor: "#016837" },
  historyIconHand: { width: 2, height: 9, backgroundColor: "#016837", position: "absolute", top: 7, left: 12 },
  termsIcon: { width: 24, height: 28, position: "relative" },
  termsIconPaper: { width: 22, height: 28, borderWidth: 2.5, borderColor: "#016837", borderRadius: 3, backgroundColor: "#fff" },
  termsIconLines: { position: "absolute", top: 7, left: 4, width: 14, height: 12, borderTopWidth: 2, borderBottomWidth: 2, borderColor: "#016837" },

  navText: { fontSize: 10, color: "#016837", marginTop: 4, fontFamily: "Montserrat-Regular" },
  navTextActive: { fontSize: 10, color: "#016837", marginTop: 4, fontFamily: "Montserrat-Regular" },

  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999' }
});

export default Riwayat_Driver;