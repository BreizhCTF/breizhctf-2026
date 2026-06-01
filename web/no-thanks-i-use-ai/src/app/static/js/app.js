let currentPartner = null;
let pollInterval = null;
let pendingAttachment = null;
let ws = null;

const userSearchInput = document.getElementById('userSearch');
const searchResults = document.getElementById('searchResults');
const conversationsList = document.getElementById('conversationsList');
const chatArea = document.getElementById('chatArea');
const emptyState = document.getElementById('emptyState');
const chatInterface = document.getElementById('chatInterface');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const partnerName = document.getElementById('partnerName');
const partnerAvatar = document.getElementById('partnerAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const attachmentPreview = document.getElementById('AttachmentPreview');
const attachmentName = document.getElementById('attachmentName');
const removeAttachmentBtn = document.getElementById('removeAttachmentBtn');
const dropOverlay = document.getElementById('dropOverlay');

document.addEventListener('DOMContentLoaded', async () => {
    connectWebSocket();
    try {
        const res = await fetch('/api/conversations');
        const users = await res.json();
        if (users && Array.isArray(users)) {
            users.forEach(user => addToSidebar(user, false));
        }
    } catch (err) {
        console.error('Init error', err);
    }
});

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (currentPartner && 
            ((msg.from === currentPartner && msg.to === getUserName()) || 
             (msg.from === getUserName() && msg.to === currentPartner))) {
            const wasAtBottom = isScrolledToBottom();
            messagesContainer.appendChild(createMessageElement(msg));
            if (wasAtBottom) scrollToBottom();
        }
        
        if (msg.to === getUserName() && msg.from !== currentPartner) {
            addToSidebar(msg.from, false);
            const userItem = Array.from(conversationsList.children).find(el => el.dataset.user === msg.from);
            if (userItem) userItem.classList.add('unread');
        }
    };

    ws.onclose = () => {
        setTimeout(connectWebSocket, 3000);
    };
}

function getUserName() {
    return document.querySelector('.user-profile span').textContent;
}

userSearchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (query.length < 1) {
        searchResults.classList.add('hidden');
        return;
    }

    try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const users = await res.json();
        renderSearchResults(users);
    } catch (err) {
        console.error('Search error', err);
    }
});

function renderSearchResults(users) {
    searchResults.innerHTML = '';
    if (users.length === 0) {
        searchResults.classList.add('hidden');
        return;
    }

    users.forEach(user => {
        const div = document.createElement('div');
        div.className = 'search-item';
        
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        avatar.style.width = '30px';
        avatar.style.height = '30px';
        avatar.style.fontSize = '0.8rem';
        avatar.style.marginRight = '10px';
        avatar.textContent = user[0].toUpperCase();
        
        const span = document.createElement('span');
        span.textContent = user;
        
        div.appendChild(avatar);
        div.appendChild(span);
        
        div.addEventListener('click', () => {
            selectUser(user);
            userSearchInput.value = '';
            searchResults.classList.add('hidden');
        });
        searchResults.appendChild(div);
    });
    searchResults.classList.remove('hidden');
}

function selectUser(user) {
    if (currentPartner === user) return;
    currentPartner = user;
    
    emptyState.style.display = 'none';
    chatInterface.classList.remove('hidden');
    partnerName.textContent = user;
    partnerAvatar.textContent = user[0].toUpperCase();
    
    addToSidebar(user);
    
    const userItem = Array.from(conversationsList.children).find(el => el.dataset.user === user);
    if (userItem) userItem.classList.remove('unread');

    messagesContainer.innerHTML = '';
    loadMessages(); 
}

function addToSidebar(user, shouldActivate = true) {
    const existing = Array.from(conversationsList.children).find(el => el.dataset.user === user);
    
    if (shouldActivate) {
        Array.from(conversationsList.children).forEach(el => el.classList.remove('active'));
    }

    if (existing) {
        if (shouldActivate) {
             existing.classList.add('active');
        } else {
             conversationsList.prepend(existing);
        }
        return;
    }

    const div = document.createElement('div');
    div.className = shouldActivate ? 'user-item active' : 'user-item';
    div.dataset.user = user;
    
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.style.width = '35px';
    avatar.style.height = '35px';
    avatar.style.marginRight = '10px';
    avatar.textContent = user[0].toUpperCase();
    
    const span = document.createElement('span');
    span.textContent = user;
    
    div.appendChild(avatar);
    div.appendChild(span);

    div.addEventListener('click', () => selectUser(user));
    conversationsList.prepend(div);
}

async function loadMessages() {
    if (!currentPartner) return;
    
    try {
        const res = await fetch(`/api/messages/${currentPartner}`);
        const messages = await res.json();
        renderMessages(messages);
    } catch (err) {
        console.error('Load messages error', err);
    }
}

function renderMessages(messages) {
    messagesContainer.innerHTML = '';
    const wasAtBottom = isScrolledToBottom();
    
    messages.forEach(msg => {
        messagesContainer.appendChild(createMessageElement(msg));
    });
    
    if (wasAtBottom) scrollToBottom();
}

function createMessageElement(msg) {
    const isMe = msg.from !== currentPartner;
    const direction = isMe ? 'sent' : 'received';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${direction}`;
    
    if (msg.content) {
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        appendLinkifiedText(textDiv, msg.content);
        messageDiv.appendChild(textDiv);
    }

    if (msg.attachment) {
        const attachmentDiv = document.createElement('div');
        attachmentDiv.className = 'message-attachment';
        
        if (msg.attachment.type === 'image') {
            const img = document.createElement('img');
            img.src = msg.attachment.url;
            img.className = 'message-image';
            img.onclick = () => window.open(msg.attachment.url);
            attachmentDiv.appendChild(img);
        } else {
            const fileLink = document.createElement('a');
            fileLink.href = msg.attachment.url;
            fileLink.download = '';
            fileLink.target = '_blank';
            fileLink.className = 'message-attachment-file';
            
            const icon = document.createElement('span');
            icon.className = 'icon icon-file';
            
            const nameSpan = document.createElement('span');
            nameSpan.style.textDecoration = 'underline';
            nameSpan.textContent = msg.attachment.name;
            
            fileLink.appendChild(icon);
            fileLink.appendChild(document.createTextNode(' '));
            fileLink.appendChild(nameSpan);
            
            attachmentDiv.appendChild(fileLink);
        }
        messageDiv.appendChild(attachmentDiv);
    }
    
    return messageDiv;
}

function appendLinkifiedText(container, text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText) {
            container.appendChild(document.createTextNode(beforeText));
        }

        let url = match[0];
        let suffix = '';

        while (url.length > 0) {
            const lastChar = url[url.length - 1];
            if (")].,;?!".includes(lastChar)) {
                if (lastChar === ')') {
                    const openCount = (url.match(/\(/g) || []).length;
                    const closeCount = (url.match(/\)/g) || []).length;
                    if (openCount >= closeCount) {
                        break;
                    }
                }
                suffix = lastChar + suffix;
                url = url.slice(0, -1);
            } else {
                break;
            }
        }
        
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.target = '_blank';
        anchor.style.color = 'inherit';
        anchor.style.wordBreak = 'break-all';
        anchor.textContent = url;
        container.appendChild(anchor);

        if (suffix) {
            container.appendChild(document.createTextNode(suffix));
        }

        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-iframe-container';
        const iframe = document.createElement('iframe');
        iframe.src = url;
        previewContainer.appendChild(iframe);
        container.appendChild(previewContainer);

        lastIndex = urlRegex.lastIndex;
    }

    const remainingText = text.substring(lastIndex);
    if (remainingText) {
        container.appendChild(document.createTextNode(remainingText));
    }
}

const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

const sendMessage = async () => {
    const content = messageInput.value.trim();
    if ((!content && !pendingAttachment) || !currentPartner) return;
    
    messageInput.value = ''; 
    
    let attachmentData = null;
    if (pendingAttachment) {
        try {
            const base64Content = await readFileAsBase64(pendingAttachment);
            const currentUser = getUserName();

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: pendingAttachment.name,
                    content: base64Content,
                    allowed_users: [currentUser, currentPartner]
                })
            });
            const uploadResData = await uploadRes.json();
            if (uploadResData.url) {
                const isImage = uploadResData.mimetype && uploadResData.mimetype.startsWith('image/');
                attachmentData = {
                    url: uploadResData.url,
                    type: isImage ? 'image' : 'file',
                    name: pendingAttachment.name
                };
            }
        } catch (err) {
            console.error('Upload failed', err);
            alert('Échec de l\'envoi du fichier');
            return;
        }
    }

    clearAttachment();

    try {
        await fetch('/api/send_message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: currentPartner,
                content: content,
                attachment: attachmentData
            })
        });
    } catch (err) {
        console.error('Send error', err);
    }
};

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

attachBtn.addEventListener('click', () => fileInput.click());

let dragCounter = 0;

chatInterface.addEventListener('dragenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter++;
    dropOverlay.classList.remove('hidden');
});

chatInterface.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter--;
    if (dragCounter === 0) {
        dropOverlay.classList.add('hidden');
    }
});

chatInterface.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
});

chatInterface.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter = 0;
    dropOverlay.classList.add('hidden');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelection(files[0]);
    }
});

function handleFileSelection(file) {
    if (file.size > 16 * 1024 * 1024) {
        alert('Fichier trop volumineux (Max 16Mo)');
        return;
    }
    
    pendingAttachment = file;
    
    attachmentName.textContent = pendingAttachment.name;
    attachmentPreview.classList.add('visible');
    fileInput.value = '';
}

fileInput.addEventListener('change', (e) => {
    if (!e.target.files.length) return;
    handleFileSelection(e.target.files[0]);
});

removeAttachmentBtn.addEventListener('click', clearAttachment);

function clearAttachment() {
    pendingAttachment = null;
    attachmentPreview.classList.remove('visible');
    attachmentName.textContent = '';
}

function isScrolledToBottom() {
    const threshold = 100;
    return messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < threshold;
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.reload();
});

document.addEventListener('click', (e) => {
    if (!userSearchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
    }
});
