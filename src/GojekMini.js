import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, MessageCircle, Phone, X, User, Car, Search, Menu, Star, Clock, MapPinned } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import L from 'leaflet';

// Mock Supabase untuk demo
const createMockSupabase = () => {
  const listeners = {};
  let locations = [
    { user_id: 'd1', user_type: 'driver', user_name: 'Budi Santoso', lat: -7.5680, lon: 110.8180 },
    { user_id: 'd2', user_type: 'driver', user_name: 'Ahmad Rizki', lat: -7.5690, lon: 110.8190 },
    { user_id: 'd3', user_type: 'driver', user_name: 'Dedi Kurniawan', lat: -7.5670, lon: 110.8170 }
  ];
  let messages = [];

  return {
    from: (table) => ({
      select: () => ({
        eq: (field, value) => ({
          then: (cb) => {
            setTimeout(() => {
              if (table === 'locations') {
                cb({ data: locations.filter(l => l.user_type === value) });
              } else if (table === 'messages') {
                cb({ data: messages });
              }
            }, 100);
          }
        }),
        order: () => ({
          then: (cb) => {
            setTimeout(() => {
              if (table === 'messages') {
                cb({ data: messages.slice().sort((a, b) => a.time - b.time) });
              }
            }, 100);
          }
        })
      }),
      insert: (data) => ({
        then: (cb) => {
          setTimeout(() => {
            if (table === 'messages') {
              messages.push({ ...data, time: Date.now() });
              cb({ data: data });
            }
          }, 100);
        }
      }),
      upsert: (data) => ({
        then: (cb) => {
          setTimeout(() => {
            if (table === 'locations') {
              const idx = locations.findIndex(l => l.user_id === data.user_id);
              if (idx > -1) locations[idx] = data;
              else locations.push(data);
              cb({ data: data });
            }
          }, 100);
        }
      })
    }),
    channel: (name) => ({
      on: (event, config, callback) => {
        const key = config.table;
        listeners[key] = callback;
        return { subscribe: () => {} };
      },
      subscribe: () => {}
    }),
    removeChannel: () => {}
  };
};

const GojekClone = () => {
  const [mode, setMode] = useState(null);
  const [userName, setUserName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const [userId, setUserId] = useState('');
  
  const [myLocation, setMyLocation] = useState({ lat: -7.5666, lng: 110.8166, address: 'Surakarta, Jawa Tengah' });
  const [destination, setDestination] = useState(null);
  
  const [showChat, setShowChat] = useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [matchedDriver, setMatchedDriver] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  
  const supabase = useRef(createMockSupabase());
  const socket = useRef(io('http://localhost:3000')).current;

  useEffect(() => {
    const uid = 'user-' + Math.random().toString(36).substring(2, 9);
    setUserId(uid);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMyLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Lokasi Saat Ini'
          });
        }
      );
    }
  }, []);

  useEffect(() => {
    if (!mode) return;
    fetchNearbyDrivers();
    const interval = setInterval(updateMyLocation, 5000);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (mode === 'driver') {
      socket.emit('registerDriver', userId);
    } else if (mode === 'passenger') {
      socket.emit('registerPassenger', userId);
    }
  }, [mode, userId]);

  useEffect(() => {
    if (mode === 'driver') {
      socket.on('newOrder', (order) => {
        // Tampilkan order masuk, misal setIncomingOrder(order)
        setCurrentOrder(order);
      });
    }
    return () => socket.off('newOrder');
  }, [mode]);

  useEffect(() => {
    if (mode === 'passenger') {
      socket.on('orderAccepted', (order) => {
        setMatchedDriver({ id: order.driverId, name: order.driverName, lat: order.driverLat, lng: order.driverLng });
        setCurrentOrder(order);
        setShowOrderPanel(false);
        setShowChat(true); // Langsung buka chat setelah dapat driver
      });
    }
    return () => socket.off('orderAccepted');
  }, [mode]);

  const fetchNearbyDrivers = async () => {
    if (mode !== 'passenger') return;
    
    supabase.current.from('locations').select().eq('user_type', 'driver').then(({ data }) => {
      if (data) {
        const driversWithDistance = data.map(driver => ({
          id: driver.user_id,
          name: driver.user_name || 'Driver',
          lat: driver.lat,
          lng: driver.lon,
          distance: calculateDistance(myLocation.lat, myLocation.lng, driver.lat, driver.lon),
          rating: (4.5 + Math.random() * 0.4).toFixed(1)
        })).sort((a, b) => a.distance - b.distance);
        setNearbyDrivers(driversWithDistance);
      }
    });
  };

  const updateMyLocation = async () => {
    if (!userId || !mode) return;
    supabase.current.from('locations').upsert({
      user_id: userId,
      user_type: mode === 'driver' ? 'driver' : 'penumpang',
      user_name: userName,
      lat: myLocation.lat,
      lon: myLocation.lng,
    });
  };

  const fetchMessages = async () => {
    supabase.current.from('messages').select().order().then(({ data }) => {
      if (data) {
        const formattedMessages = data.map(msg => ({
          sender: msg.sender_id === userId ? mode : (mode === 'driver' ? 'passenger' : 'driver'),
          text: msg.message,
          time: new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }));
        setMessages(formattedMessages);
      }
    });
  };

  const handleStartSession = () => {
    if (!userName.trim()) {
      alert('Masukkan nama Anda!');
      return;
    }
    setShowNameInput(false);
  };

  const handleModeSelect = async (selectedMode) => {
    setMode(selectedMode);
    supabase.current.from('locations').upsert({
      user_id: userId,
      user_type: selectedMode === 'driver' ? 'driver' : 'penumpang',
      user_name: userName,
      lat: myLocation.lat,
      lon: myLocation.lng,
    });
  };

  const handleSearchNearbyDrivers = () => {
    fetchNearbyDrivers();
    setShowOrderPanel(true);
  };

  const handleCreateOrder = async (driver) => {
    if (!destination) {
      alert('Pilih tujuan terlebih dahulu!');
      return;
    }
    const order = {
      orderId: 'ORD' + Date.now(),
      passengerId: userId,
      passengerSocketId: socket.id,
      driverId: driver.id,
      driverName: driver.name,
      driverLat: driver.lat,
      driverLng: driver.lng,
      destination,
      status: 'pending'
    };
    socket.emit('createOrder', order);
    setCurrentOrder(order);
    setShowOrderPanel(false); // Tutup panel driver
    setShowChat(true);        // Langsung buka chat dengan driver
  };

  const handleAcceptOrder = () => {
    if (currentOrder) {
      socket.emit('acceptOrder', currentOrder.orderId, userId);
      setMatchedDriver({ id: userId, name: userName, lat: myLocation.lat, lng: myLocation.lng });
      setShowChat(true); // Langsung buka chat di sisi driver
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        setDestination({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: data[0].display_name
        });
        setSearchQuery('');
      } else {
        alert('Lokasi tidak ditemukan!');
      }
    } catch (error) {
      alert('Error mencari lokasi');
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    const to = mode === 'passenger' ? matchedDriver?.id : currentOrder?.passengerId;
    socket.emit('chat', { to, from: userId, text: messageInput });
    setMessages((prev) => [...prev, { sender: mode, text: messageInput, time: new Date().toLocaleTimeString() }]);
    setMessageInput('');
  };

  useEffect(() => {
    socket.on('chat', (msg) => {
      setMessages((prev) => [...prev, { sender: msg.from === userId ? mode : (mode === 'driver' ? 'passenger' : 'driver'), text: msg.text, time: new Date().toLocaleTimeString() }]);
    });
    return () => socket.off('chat');
  }, [mode, userId]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  if (showNameInput) {
    return (
      <div style={{
        height: '100vh',
        background: 'linear-gradient(135deg, #00C851 0%, #007E33 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '40px',
          width: '100%',
          maxWidth: '440px',
          animation: 'slideUp 0.5s ease'
        }}>
          <style>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1, transform: translateY(0); }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
          
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{
              display: 'inline-flex',
              background: 'linear-gradient(135deg, #00C851, #007E33)',
              color: 'white',
              padding: '20px',
              borderRadius: '50%',
              marginBottom: '20px',
              boxShadow: '0 8px 24px rgba(0,200,81,0.3)'
            }}>
              <Car size={48} />
            </div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1a1a1a',
              marginBottom: '8px'
            }}>Gojek Clone</h1>
            <p style={{ color: '#666', fontSize: '16px' }}>Aplikasi Ojek Online Real-time</p>
          </div>
          
          <input
            type="text"
            placeholder="Masukkan nama Anda"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleStartSession()}
            style={{
              width: '100%',
              padding: '16px',
              border: '2px solid #e0e0e0',
              borderRadius: '12px',
              fontSize: '16px',
              marginBottom: '20px',
              outline: 'none',
              transition: 'all 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#00C851'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
          
          <button
            onClick={handleStartSession}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #00C851, #007E33)',
              color: 'white',
              padding: '16px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 4px 12px rgba(0,200,81,0.3)'
            }}
            onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
          >
            Mulai Sekarang
          </button>
        </div>
      </div>
    );
  }

  if (!mode) {
    return (
      <div style={{
        height: '100vh',
        background: 'linear-gradient(135deg, #00C851 0%, #007E33 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          padding: '40px',
          width: '100%',
          maxWidth: '440px'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '8px',
            color: '#1a1a1a'
          }}>Halo, {userName}! 👋</h2>
          <p style={{
            color: '#666',
            textAlign: 'center',
            marginBottom: '32px',
            fontSize: '15px'
          }}>Pilih mode yang ingin Anda gunakan</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button
              onClick={() => handleModeSelect('passenger')}
              style={{
                background: 'linear-gradient(135deg, #00C851, #007E33)',
                color: 'white',
                padding: '24px',
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(0,200,81,0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 24px rgba(0,200,81,0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(0,200,81,0.3)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <User size={32} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '18px' }}>Penumpang</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Cari driver terdekat</div>
                </div>
              </div>
              <div style={{ fontSize: '28px' }}>→</div>
            </button>
            
            <button
              onClick={() => handleModeSelect('driver')}
              style={{
                background: 'linear-gradient(135deg, #2c3e50, #1a252f)',
                color: 'white',
                padding: '24px',
                borderRadius: '16px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 4px 12px rgba(44,62,80,0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 24px rgba(44,62,80,0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(44,62,80,0.3)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Car size={32} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '18px' }}>Driver</div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Terima pesanan</div>
                </div>
              </div>
              <div style={{ fontSize: '28px' }}>→</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Custom marker icon
  const icon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{
        background: mode === 'passenger' 
          ? 'linear-gradient(135deg, #00C851, #007E33)'
          : 'linear-gradient(135deg, #2c3e50, #1a252f)',
        color: 'white',
        padding: '16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '8px',
              borderRadius: '12px'
            }}>
              {mode === 'passenger' ? <User size={24} /> : <Car size={24} />}
            </div>
            <div>
              <h1 style={{ fontWeight: 'bold', fontSize: '18px', margin: 0 }}>{userName}</h1>
              <p style={{ fontSize: '12px', opacity: 0.9, margin: 0 }}>
                {mode === 'passenger' ? 'Penumpang' : 'Driver'}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {matchedDriver && (
              <button
                onClick={() => setShowChat(!showChat)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '10px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              >
                <MessageCircle size={20} />
                {messages.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ff3b30',
                    color: 'white',
                    fontSize: '11px',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {messages.length}
                  </span>
                )}
              </button>
            )}
            <button
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '10px',
                borderRadius: '50%',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Map Area */}
      <div style={{ flex: 1, position: 'relative', background: '#e0e0e0' }}>
        {(destination || matchedDriver) ? (
          <MapContainer
            center={[myLocation.lat, myLocation.lng]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {/* Marker Lokasi Awal */}
            <Marker position={[myLocation.lat, myLocation.lng]} icon={icon}>
              <Popup>Lokasi Anda</Popup>
            </Marker>
            {/* Marker Tujuan */}
            {destination && (
              <Marker position={[destination.lat, destination.lng]} icon={icon}>
                <Popup>Tujuan: {destination.address}</Popup>
              </Marker>
            )}
            {/* Garis ke Tujuan */}
            {destination && (
              <Polyline
                positions={[
                  [myLocation.lat, myLocation.lng],
                  [destination.lat, destination.lng]
                ]}
                color="#00C851"
              />
            )}
            {/* Marker Driver */}
            {matchedDriver && (
              <Marker position={[matchedDriver.lat, matchedDriver.lng]} icon={icon}>
                <Popup>Driver Anda: {matchedDriver.name}</Popup>
              </Marker>
            )}
          </MapContainer>
        ) : (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999'
          }}>
            <div style={{ textAlign: 'center' }}>
              <MapPin size={64} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: '18px', fontWeight: '500' }}>Peta OpenStreetMap</p>
              <p style={{ fontSize: '14px' }}>(Implementasi Leaflet.js)</p>
            </div>
          </div>
        )}

        {/* Location Card */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '16px',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <MapPin size={20} style={{ color: '#00C851', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px 0' }}>Lokasi Saat Ini</p>
              <p style={{ fontWeight: '600', fontSize: '14px', margin: 0 }}>{myLocation.address}</p>
            </div>
          </div>
          
          {destination && (
            <>
              <div style={{
                borderLeft: '2px dashed #ddd',
                height: '16px',
                marginLeft: '10px',
                marginTop: '8px',
                marginBottom: '8px'
              }}></div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Navigation size={20} style={{ color: '#ff3b30', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px 0' }}>Tujuan</p>
                  <p style={{ fontWeight: '600', fontSize: '14px', margin: 0 }}>{destination.address}</p>
                </div>
                <button
                  onClick={() => setDestination(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Matched Driver Card */}
        {matchedDriver && (
          <div style={{
            position: 'absolute',
            bottom: '120px',
            left: '16px',
            right: '16px',
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
            padding: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Driver Anda</h3>
              <span style={{
                padding: '6px 12px',
                background: '#d4edda',
                color: '#155724',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '20px'
              }}>
                Menuju Lokasi
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #2c3e50, #1a252f)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>
                  <Car size={24} />
                </div>
                <div>
                  <p style={{ fontWeight: '600', fontSize: '16px', margin: '0 0 4px 0' }}>
                    {matchedDriver.name}
                  </p>
                  <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
                    Jarak: {calculateDistance(myLocation.lat, myLocation.lng, matchedDriver.lat, matchedDriver.lng)} km
                  </p>
                </div>
              </div>
              
              <button style={{
                padding: '12px',
                background: '#00C851',
                color: 'white',
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,200,81,0.3)',
                transition: 'transform 0.2s'
              }}
              onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
              >
                <Phone size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div style={{
        background: 'white',
        borderTop: '1px solid #e0e0e0',
        padding: '16px',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {mode === 'passenger' && !currentOrder && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Cari tujuan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchLocation()}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#00C851'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
                <button
                  onClick={handleSearchLocation}
                  style={{
                    padding: '0 20px',
                    background: '#f0f0f0',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#e0e0e0'}
                  onMouseLeave={(e) => e.target.style.background = '#f0f0f0'}
                >
                  <Search size={20} />
                </button>
              </div>
              
              <button
                onClick={handleSearchNearbyDrivers}
                disabled={!destination}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  color: 'white',
                  border: 'none',
                  cursor: destination ? 'pointer' : 'not-allowed',
                  background: destination 
                    ? 'linear-gradient(135deg, #00C851, #007E33)'
                    : '#ddd',
                  transition: 'transform 0.2s',
                  boxShadow: destination ? '0 4px 12px rgba(0,200,81,0.3)' : 'none'
                }}
                onMouseDown={(e) => destination && (e.target.style.transform = 'scale(0.98)')}
                onMouseUp={(e) => destination && (e.target.style.transform = 'scale(1)')}
              >
                {destination ? 'Cari Driver Terdekat' : 'Tentukan Tujuan Dulu'}
              </button>
            </div>
          )}

          {mode === 'driver' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <p style={{ color: '#666', margin: '0 0 8px 0' }}>Menunggu pesanan masuk...</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: '#00C851',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite'
                }}></div>
                <span style={{ fontSize: '14px', color: '#00C851', fontWeight: '600' }}>Online</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Panel Modal */}
      {showOrderPanel && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'flex-end',
          zIndex: 50,
          animation: 'fadeIn 0.3s'
        }}>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideInUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
          <div style={{
            background: 'white',
            width: '100%',
            borderRadius: '24px 24px 0 0',
            maxHeight: '70vh',
            overflowY: 'auto',
            animation: 'slideInUp 0.3s'
          }}>
            <div style={{
              position: 'sticky',
              top: 0,
              background: 'white',
              padding: '20px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: '24px 24px 0 0'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>Driver Terdekat</h2>
              <button
                onClick={() => setShowOrderPanel(false)}
                style={{
                  background: '#f5f5f5',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#e0e0e0'}
                onMouseLeave={(e) => e.target.style.background = '#f5f5f5'}
              >
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {nearbyDrivers.map((driver) => (
                <div
                  key={driver.id}
                  style={{
                    border: '2px solid #e0e0e0',
                    borderRadius: '16px',
                    padding: '16px',
                    transition: 'all 0.3s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#00C851';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,200,81,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        background: 'linear-gradient(135deg, #2c3e50, #1a252f)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <Car size={24} />
                      </div>
                      <div>
                        <p style={{ fontWeight: '600', fontSize: '16px', margin: '0 0 4px 0' }}>
                          {driver.name}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Star size={14} style={{ color: '#ffc107', fill: '#ffc107' }} />
                          <span style={{ fontSize: '14px', color: '#666' }}>{driver.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 'bold', fontSize: '16px', color: '#00C851', margin: '0 0 4px 0' }}>
                        {driver.distance} km
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} style={{ color: '#999' }} />
                        <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>
                          ~{Math.ceil(driver.distance * 3)} menit
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleCreateOrder(driver)}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #00C851, #007E33)',
                      color: 'white',
                      padding: '12px',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontWeight: '600',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      boxShadow: '0 4px 12px rgba(0,200,81,0.3)'
                    }}
                    onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                    onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    Pilih Driver
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {showChat && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'flex-end',
          zIndex: 50,
          animation: 'fadeIn 0.3s'
        }}>
          <div style={{
            background: 'white',
            width: '100%',
            borderRadius: '24px 24px 0 0',
            height: '70vh',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInUp 0.3s'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #00C851, #007E33)',
              color: 'white',
              padding: '20px',
              borderRadius: '24px 24px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                Chat dengan {mode === 'passenger' ? 'Driver' : 'Penumpang'}
              </h2>
              <button
                onClick={() => setShowChat(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '8px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              >
                <X size={24} />
              </button>
            </div>
            
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: '#f5f5f5'
            }}>
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: msg.sender === mode ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius: '16px',
                      background: msg.sender === 'system'
                        ? '#e0e0e0'
                        : msg.sender === mode
                        ? 'linear-gradient(135deg, #00C851, #007E33)'
                        : '#fff',
                      color: msg.sender === 'system' || msg.sender !== mode ? '#333' : 'white',
                      boxShadow: msg.sender !== 'system' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                      borderBottomRightRadius: msg.sender === mode ? '4px' : '16px',
                      borderBottomLeftRadius: msg.sender === mode ? '16px' : '4px'
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '15px' }}>{msg.text}</p>
                    {msg.time && (
                      <p style={{
                        margin: '4px 0 0 0',
                        fontSize: '11px',
                        opacity: 0.7
                      }}>
                        {msg.time}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{
              padding: '16px',
              borderTop: '1px solid #e0e0e0',
              background: 'white'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Ketik pesan..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  style={{
                    flex: 1,
                    padding: '14px 16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#00C851'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
                <button
                  onClick={handleSendMessage}
                  style={{
                    padding: '0 24px',
                    background: 'linear-gradient(135deg, #00C851, #007E33)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    boxShadow: '0 4px 12px rgba(0,200,81,0.3)'
                  }}
                  onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                  onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                >
                  Kirim
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GojekClone;