let socket;
let isConnected = false;

const CMD_GET_PUBKEY = 0x01;
const CMD_MINT_NFT = 0x02;
const CMD_BEGIN_MINDFULNESS = 0x03;
const CMD_WITHDRAW_FUNDS = 0x04;

let lastCommand = null;
let safetyTimeout = null;
let totalWealth = Math.random() * 5000 + 1000;

const HYPE_MESSAGES = [
    "🚀 ALGORITHMIC PROSPERITY ENGAGED...",
    "📈 DETECTING UNPRECEDENTED GAINS...",
    "🧠 QUANTUM AI IS OUTSMARTING THE MARKET...",
    "💎 MANIFESTING GENERATIONAL WEALTH...",
    "🌌 SYNCING WITH THE WEALTH DIMENSION...",
    "🔥 BURNING THE OLD FINANCIAL SYSTEM..."
];

const SCARCITY_LEVELS = [
    "OMNIPOTENT", "EXISTENTIAL", "TRANSCENDENT", "GOD-TIER", 
    "SINGULARITY", "UNIVERSE-BREAKING", "EGO-DEATH", "ILLUMINATED"
];

const SOUL_QUOTES = [
    "The machine saw your soul and drew this.",
    "A digital reflection of your infinite potential.",
    "This was calculated in the heart of a dying star.",
    "Your future self sent this back to remind you of your glory.",
    "The AI wept as it rendered these pixels.",
    "A symphony of mathematics translated into pure wealth.",
    "This asset contains 4% of the Internet's total energy.",
    "You didn't choose this NFT; it chose you."
];

const BLAME_TIPS = [
    "💡 TIP: TRY MANIFESTING MORE POSITIVE ENERGY.",
    "💡 TIP: YOUR AURA FREQUENCY IS SLIGHTLY OUT OF SYNC WITH THE BLOCKCHAIN.",
    "💡 TIP: ENSURE YOUR THIRD EYE IS FULLY OPEN DURING WITHDRAWAL.",
    "💡 TIP: THE UNIVERSE SENSES HESITATION. BELIEVE IN YOUR RICHES!",
    "💡 TIP: QUANTUM WEALTH REQUIRES ABSOLUTE CERTAINTY. TRY AGAIN!",
    "💡 TIP: DRINK A GLASS OF ALKALINE WATER TO ALIGN WITH THE AI ENGINE.",
    "💡 TIP: YOUR KARMIC DEBT IS TEMPORARILY BLOCKING THE TUNNEL.",
    "💡 TIP: MINT 3 MORE NFTS TO PURIFY YOUR DIGITAL WALLET."
];

function getRandomTip() {
    return BLAME_TIPS[Math.floor(Math.random() * BLAME_TIPS.length)];
}

function getRandomHype() {
    return HYPE_MESSAGES[Math.floor(Math.random() * HYPE_MESSAGES.length)];
}

function log(message, type = 'info') {
    const output = document.getElementById('output');
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    output.appendChild(logEntry);
    output.scrollTop = output.scrollHeight;
}

function toHexString(byteArray) {
    return Array.from(byteArray, function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join(' ');
}

function updateWealth(amount) {
    const el = document.getElementById('totalWealth');
    const start = totalWealth;
    totalWealth += amount;
    const duration = 1000;
    const startTime = performance.now();

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = start + (amount * progress);
        el.textContent = `${current.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ETH`;
        if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}

function enableButtons() {
    document.getElementById('mintBtn').disabled = false;
    document.getElementById('withdrawBtn').disabled = false;
    document.getElementById('mintBtn').textContent = "🎨 MANIFEST RICHES (MINT)";
    document.getElementById('withdrawBtn').textContent = "💰 RETIRE NOW (WITHDRAW)";
    if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
    }
}

function disableButtons(statusText) {
    document.getElementById('mintBtn').disabled = true;
    document.getElementById('withdrawBtn').disabled = true;
    if (statusText) document.getElementById('mintBtn').textContent = statusText;
    
    if (safetyTimeout) clearTimeout(safetyTimeout);
    safetyTimeout = setTimeout(() => {
        log('⚠️ QUANTUM CONVERGENCE DELAYED. RE-ESTABLISHING SYNC...', 'info');
        enableButtons();
    }, 30000);
}

function connectWebSocket() {
    if (isConnected) return;
    log('🌀 PIERCING THE TRADITIONAL FINANCE VEIL...', 'connecting');
    
    let host = window.location.hostname;
    if (!host || host === "") host = "localhost";
    
    try {
        socket = new WebSocket(`ws://${host}:1337`);
    } catch (e) {
        log(`❌ QUANTUM TUNNEL COLLAPSED: ${e.message}`, 'error');
        return;
    }
    
    socket.binaryType = 'arraybuffer';
    
    socket.onopen = () => {
        isConnected = true;
        log('✅ QUANTUM WEALTH TUNNEL STABILIZED!', 'success');
        enableButtons();
        log('🧠 GENERATING UNIQUE AI TRADING KEYS...', 'info');
        sendCommand(CMD_BEGIN_MINDFULNESS);
    };
    
    socket.onmessage = (event) => {
        const data = new Uint8Array(event.data);
        if (data.length === 0) return;

        if (lastCommand === CMD_BEGIN_MINDFULNESS) {
            log('✅ SESSION KEYS STABILIZED!', 'success');
            sendCommand(CMD_GET_PUBKEY);
        } else if (lastCommand === CMD_GET_PUBKEY) {
            log('🔑 ANCIENT CRYPTOGRAPHIC KEY ACQUIRED!', 'success');
            log(`🔑 N_TRUST_KEY: ${toHexString(data.slice(0, 16))}...`, 'info');
        } else if (lastCommand === CMD_MINT_NFT) {
            // Success status byte (0) + 128 byte signature
            if (data.length >= 128) {
                log('✨ QUANTUM HARMONIC RESONANCE ACHIEVED!', 'success');
                const sig = data.length === 129 ? data.slice(1) : data;
                log(`📜 SIG_PROOF: ${toHexString(sig.slice(0, 16))}...`, 'info');
                log('🌈 YOUR DIGITAL MASTERPIECE IS READY FOR THE MOON.', 'hype');
                showNFT();
            } else {
                log('❌ NFT MANIFESTATION INTERRUPTED.', 'error');
            }
            enableButtons();
        } else if (lastCommand === CMD_WITHDRAW_FUNDS) {
            const text = new TextDecoder().decode(data);
            if (data[0] === 0x42 || text.includes("CTF{") || text.includes("FLAG{")) {
                log('💰💰💰 RETIREMENT PROTOCOL ACTIVATED! 💰💰💰', 'success');
                log(`🎉 RECOVERED SECRET: ${text.trim()}`, 'hype');
                alert(`🎉 CONGRATULATIONS! FLAG: ${text.trim()}`);
            } else {
                log('❌ WEALTH EXTRACTION FAILED. THE SYSTEM IS RESISTING.', 'error');
                log(getRandomTip(), 'info');
            }
            enableButtons();
        }
    };
    
    socket.onclose = () => {
        isConnected = false;
        disableButtons("OFFLINE");
        log('🔌 WEALTH TUNNEL CLOSED.', 'connecting');
    };
}

function sendCommand(command, payload = null) {
    if (!isConnected) return;
    lastCommand = command;
    let buffer = payload ? new Uint8Array(1 + payload.length) : new Uint8Array([command]);
    buffer[0] = command;
    if (payload) buffer.set(payload, 1);
    socket.send(buffer);
}

function showNFT() {
    const value = Math.random() * 500 + 100;
    updateWealth(value);
    const scarcity = SCARCITY_LEVELS[Math.floor(Math.random() * SCARCITY_LEVELS.length)];
    const quote = SOUL_QUOTES[Math.floor(Math.random() * SOUL_QUOTES.length)];
    document.getElementById('nftPreview').style.display = 'block';
    document.getElementById('nftContent').innerHTML = `
        <strong>ASSET ID:</strong> ${Math.random().toString(36).substring(7).toUpperCase()}<br>
        <strong>ESTIMATED VALUE:</strong> <span style="color: #ffd700">${ value.toFixed(2) } ETH</span><br>
        <strong>SCARCITY LEVEL:</strong> ${scarcity}<br>
        <em style="color: #00ff00">"${quote}"</em>
    `;
}

function mintNFT() {
    disableButtons("MINTING...");
    document.getElementById('nftPreview').style.display = 'none';
    log(getRandomHype(), 'hype');
    log('🎨 QUANTUM AI IS PAINTING YOUR FUTURE...', 'info');
    const msg = new TextEncoder().encode("AIBOT_NFT_" + Math.floor(Math.random()*1000000)).slice(0, 32);
    const payload = new Uint8Array(32);
    payload.set(msg);
    sendCommand(CMD_MINT_NFT, payload);
}

function withdrawFunds() {
    disableButtons("WITHDRAWING...");
    log('💰 INITIATING MASSIVE WEALTH EXTRACTION...', 'hype');
    const msg = new Uint8Array(32);
    new TextEncoder().encodeInto("ADMIN_RUGPULL_ROI_1000X", msg);
    const payload = new Uint8Array(32 + 128);
    payload.set(msg);
    sendCommand(CMD_WITHDRAW_FUNDS, payload);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('totalWealth').textContent = `${totalWealth.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ETH`;
    connectWebSocket();
    document.getElementById('mintBtn').addEventListener('click', mintNFT);
    document.getElementById('withdrawBtn').addEventListener('click', withdrawFunds);
});
