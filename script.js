// 1. Configuração Inicial do Mapa
// O 'L' vem da biblioteca Leaflet que importamos no HTML
const map = L.map('map').setView([-15.78, -47.92], 4); 
const markerGroup = L.layerGroup().addTo(map);

// Define o desenho/estilo do mapa (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// 2. Função para transformar endereço em Latitude/Longitude
async function buscarLocal(tipo) {
    const endereco = document.getElementById('endereco').value;
    const status = document.getElementById('status');

    if (!endereco) {
        status.innerHTML = "⚠️ Por favor, digite um endereço primeiro.";
        return;
    }

    status.innerHTML = "🔍 A localizar endereço...";

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`);
        const data = await response.json();

        if (data.length > 0) {
            const { lat, lon } = data[0];
            executarBuscaEspacial(lat, lon, tipo);
        } else {
            status.innerHTML = "❌ Endereço não encontrado.";
        }
    } catch (error) {
        status.innerHTML = "❌ Erro ao ligar ao serviço de mapas.";
    }
}

// 3. Função para usar o GPS do navegador
function usarGPS() {
    const status = document.getElementById('status');
    status.innerHTML = "📡 A aceder ao GPS...";

    if (!navigator.geolocation) {
        status.innerHTML = "❌ O seu navegador não suporta GPS.";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            // Se o GPS funcionar, buscamos farmácias por padrão
            executarBuscaEspacial(pos.coords.latitude, pos.coords.longitude, 'pharmacy');
        },
        () => {
            status.innerHTML = "❌ Permissão de GPS negada.";
        }
    );
}

// 4. Função Principal: Faz a busca real na API Overpass e desenha os pontos
async function executarBuscaEspacial(lat, lon, tipo) {
    const status = document.getElementById('status');
    status.innerHTML = "🚀 A procurar locais próximos...";

    markerGroup.clearLayers(); // Limpa buscas anteriores
    map.setView([lat, lon], 14); // Dá zoom na localização

    // Coloca um marcador azul onde o usuário está
    L.marker([lat, lon]).addTo(markerGroup).bindPopup("<b>Sua localização</b>").openPopup();

    const query = `[out:json][timeout:25];node["${tipo === 'pharmacy' ? 'amenity' : 'shop'}"="${tipo}"](around:3000,${lat},${lon});out;`;
    const url = `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.elements && data.elements.length > 0) {
            data.elements.forEach(item => {
                const nome = item.tags.name || (tipo === 'pharmacy' ? "Farmácia" : "Mercado");
                
                // Cria bolinhas coloridas (Vermelho para farmácia, Verde para mercado)
                L.circleMarker([item.lat, item.lon], {
                    radius: 8,
                    fillColor: tipo === 'pharmacy' ? "#ea4335" : "#34a853",
                    color: "#fff",
                    weight: 2,
                    fillOpacity: 0.8
                }).addTo(markerGroup).bindPopup(`<b>${nome}</b><br><a href="http://googleusercontent.com/maps.google.com/search?api=1&query=${item.lat},${item.lon}" target="_blank">Como chegar</a>`);
            });
            status.innerHTML = `✅ Encontrados ${data.elements.length} locais!`;
        } else {
            status.innerHTML = "⚠️ Nenhum local encontrado nesta área.";
        }
    } catch (error) {
        status.innerHTML = "❌ Erro ao carregar estabelecimentos.";
    }
}