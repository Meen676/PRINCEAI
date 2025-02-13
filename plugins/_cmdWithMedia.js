const { proto, generateWAMessage, areJidsSameUser } = (await import('@whiskeysockets/baileys')).default;

export async function all(m, chatUpdate) {
  try {
    // Skip processing if the message is from the bot itself or lacks content
    if (m.isBaileys || !m.message || !m.msg?.fileSha256) return;

    // Convert fileSha256 to Base64 and check if it exists in the database
    const fileHash = Buffer.from(m.msg.fileSha256).toString('base64');
    if (!(fileHash in global.db.data.sticker)) return;

    // Retrieve metadata from the database
    const { text, mentionedJid } = global.db.data.sticker[fileHash];

    // Generate a new WhatsApp message
    const messages = await generateWAMessage(
      m.chat,
      { text, mentions: mentionedJid },
      {
        userJid: this.user.id,
        quoted: m.quoted && m.quoted.fakeObj,
      }
    );

    // Update message key and other properties
    messages.key.fromMe = m.isBaileys || (m.sender === this.user.jid);
    messages.key.id = m.key.id;
    messages.pushName = m.pushName;
    if (m.isGroup) messages.participant = m.sender;

    // Emit the new message as an upsert event
    const msg = {
      ...chatUpdate,
      messages: [proto.WebMessageInfo.fromObject(messages)],
      type: 'append',
    };
    this.ev.emit('messages.upsert', msg);
  } catch (error) {
    console.error('[ERROR] in cmdWithMedia.js:', error);
  }
}
