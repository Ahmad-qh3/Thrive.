const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    Events,
    PermissionFlagsBits,
    ChannelType,
    AttachmentBuilder,
    MessageFlags
} = require('discord.js');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Ticket Bot is online!'));
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ==================== الإعدادات الأساسية ====================
const TOKEN = 'MTU1MzcyODQ3NTEwMDIxNzM5NQ.GOu2Xh.OUgVnC8SHoJ8wjwU2WbI9nY5lVloqG0WhR3UdI';

const CONFIG = {
    TICKET_LOG_CHANNEL_ID: '1553768731367182406', // آيدي روم سجلات الإغلاق والأرشيف
    
    // رتب الإدارة المسموح لها برؤية واستلام التذاكر
    STAFF_ROLE_IDS: [
        '1553154988799295569',
        '1553153879108091974',
        '1553154013854306425'
    ],

    DEFAULT_CATEGORY_ID: ['1568725275418558484'] // آيدي الكاتيجوري الافتراضي (اختياري)
};

// آيديات الكاتيجوريات للأقسام المختلفة
const CATEGORIES = {
    tech_support: '1568725275418558484',
    Web_Inquires: '1568725275418558484'
};

let ticketCounter = 2000; 

client.once(Events.ClientReady, c => {
    console.log(`🚀 تم تشغيل بوت التذاكر بنجاح باسم: ${c.user.tag}`);
});

// ==================== أوامر إرسال لوحات التذاكر ====================
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.guild) return;

    // أمر إرسال لوحة تذاكر الدعم العامة: !ticket-setup
    if (message.content === '!ticket-setup') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ **هذا الأمر للمسؤولين فقط!**');
        }

        const ticketEmbed = new EmbedBuilder()
            .setTitle('# THRIVE | نظام التذاكر')
            .setDescription(
                `🎫 **Tickets THRIVE**\n\n` +
                `- يرجى اختيار التذكرة المناسبة لموضوعك، ليتم الرد عليك بأسرع وقت ممكن.\n\n` +
                `- عند فتح التذكرة اكتب موضوعك بشكل كامل، ولا تكتفي بالتحية، أو انتظار الرد، أو الكتابة العشوائية (مثل: الو، رد، عندي مشكلة).\n\n` +
                `- يرجى تجنب المنشن والإزعاج بدون سبب.\n\n` +
                `- في حال كان موضوعك مختلفاً عن القسم المخصص للتذكرة، سيتم إغلاقها بشكل مباشر.\n\n` +
                `- يستغرق الرد من 4 - 6 ساعات، لذلك يمنع التذمر أو المنشن، وانتظر الرد من الإدارة.\n\n` +
                `- في حال فتح تذكرة لنفس الموضوع بعد الرد عليك، سيتم منعك من فتح التذاكر، حسب القوانين.\n\n` +
                `- الاحترام وعدم التلفظ داخل التذكرة، لأي سبب كان.\n\n` +
                `❤️ **For THRIVE Members**\n\n` +
                `يرجى الالتزام بالتعليمات والمحافظة على الاحترام والتعاون مع فريق THRIVE لضمان تقديم أفضل خدمة ممكنة.`
            )
            .setColor(0xF5F5DC) // Off-white
            .setImage('https://media.discordapp.net/attachments/1534528825021432002/1568723066522050690/Thrive__Elegant_Burgundy_Brand_Banner.png?ex=6af0dab4&is=6aef8934&hm=ad09f3564f83ac59077148811777859d883c5345b54d7225a26bbc65150981c8&=&format=webp&quality=lossless');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_ticket_type')
            .setPlaceholder('اختر القسم المناسب من هنا')
            .addOptions([
                { label: '( Technical Support - الدعم الفني )', description: '. للمشاكل الفنية', value: 'tech_support', emoji: '🎟' },
                { label: '( Website Inquires - استفسارات للموقع )', description: '. في حال كان عندك استفسار ', value: 'Web_Inquires', emoji: '🎟️' }
            ]);

        return message.channel.send({ embeds: [ticketEmbed], components: [new ActionRowBuilder().addComponents(selectMenu)] });
    }
});

// ==================== معالجة التفاعلات (فتح، إغلاق، استلام التذاكر) ====================
client.on(Events.InteractionCreate, async interaction => {

    // 1. عند اختيار قسم من القائمة لفتح تذكرة
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket_type') {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const selectedType = interaction.values[0];
            const guild = interaction.guild;
            const user = interaction.user;

            ticketCounter++;
            const ticketNumber = `#${ticketCounter}`;
            const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
            const channelName = `🟢 l ${cleanUsername || 'user'} l t-${ticketCounter}`;

            const permissionOverwrites = [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] }
            ];

            CONFIG.STAFF_ROLE_IDS.forEach(roleId => {
                if (guild.roles.cache.has(roleId)) {
                    permissionOverwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] });
                }
            });

            let targetCategory = CATEGORIES[selectedType] || CONFIG.DEFAULT_CATEGORY_ID;
            if (!guild.channels.cache.has(targetCategory)) targetCategory = null;

            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: targetCategory,
                permissionOverwrites: permissionOverwrites
            });

            await ticketChannel.setTopic(user.id);

            const member = await guild.members.fetch(user.id).catch(() => null);
            const joinedAt = member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'غير معروف';
            const createdAt = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;

            const typeNames = {
                tech_support: 'الدعم-الفني | Technical Support',
                Web_Inquires: 'استفسارات للموقع | Web Inquires',
            };
            const displayTypeName = typeNames[selectedType] || selectedType;

            // رسالة الترحيب المطلوبة عند فتح التذكرة
            const ticketEmbed = new EmbedBuilder()
                .setTitle(`${user.username}. Ticket`)
                .setThumbnail(guild.iconURL())
                .setDescription(
                    `مرحباً بك في THRIVE.\n\n` +
                    `شكراً لتواصلك معنا. يرجى توضيح طلبك بشكل كامل حتى يتمكن الفريق المختص من مساعدتك بأفضل طريقة ممكنة.\n\n` +
                    `يرجى الانتظار حتى يتولى أحد أعضاء الفريق متابعة طلبك.\n\n` +
                    `**THRIVE Team**`
                )
                .addFields(
                    { name: 'Member Info', value: `${user.username}. ( <@${user.id}> )`, inline: false },
                    { name: 'Joined Server', value: joinedAt, inline: true },
                    { name: 'Account Created', value: createdAt, inline: true },
                    { name: 'Ticket Info', value: '\u200B', inline: false },
                    { name: 'Ticket Type', value: displayTypeName, inline: true },
                    { name: 'Ticket Created', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
                    { name: 'Ticket Number', value: `\`${ticketNumber}\``, inline: true }
                )
                .setColor(0xF5F5DC) // Off-white
                .setImage('https://media.discordapp.net/attachments/1534528825021432002/1568723066522050690/Thrive__Elegant_Burgundy_Brand_Banner.png?ex=6af0dab4&is=6aef8934&hm=ad09f3564f83ac59077148811777859d883c5345b54d7225a26bbc65150981c8&=&format=webp&quality=lossless');

            const closeBtn = new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger);
            const adminOptionsBtn = new ButtonBuilder().setCustomId('admin_options_btn').setLabel('Admin Options').setEmoji('🛡️').setStyle(ButtonStyle.Secondary);
            const row = new ActionRowBuilder().addComponents(closeBtn, adminOptionsBtn);

            const pings = CONFIG.STAFF_ROLE_IDS.map(id => `<@&${id}>`).join(' ');

            await ticketChannel.send({
                content: `${pings}`,
                embeds: [ticketEmbed],
                components: [row]
            });

            await interaction.editReply({ content: `✅ تم فتح تذكرتك بنجاح: ${ticketChannel}` });

        } catch (error) {
            console.error('❌ خطأ أثناء إنشاء التذكرة:', error);
            await interaction.editReply({ content: '❌ حدث خطأ، تأكد من آيديات الكاتيجوريات والصلاحيات.' });
        }
    }

    if (interaction.isButton()) {
        const member = interaction.member;
        if (!member) return;

        // زر خيارات الإدارة داخل التذكرة
        if (interaction.customId === 'admin_options_btn') {
            const isStaff = member.permissions.has(PermissionFlagsBits.Administrator) || CONFIG.STAFF_ROLE_IDS.some(id => member.roles.cache.has(id));
            if (!isStaff) {
                return interaction.reply({ content: '❌ ليس لديك صلاحية لاستخدام هذه الخيارات.', flags: MessageFlags.Ephemeral });
            }

            const adminMenu = new StringSelectMenuBuilder()
                .setCustomId('admin_options_menu')
                .setPlaceholder('اختر الإجراء المناسب')
                .addOptions([
                    { label: 'Claim The Ticket', description: 'استلم التذكرة', value: 'claim_ticket', emoji: '📌' },
                    { label: 'Cancel claim', description: 'إلغاء الاستلام', value: 'cancel_claim', emoji: '❌' },
                    { label: 'Call User', description: 'استدعاء صاحب التذكرة بالخاص', value: 'call_user', emoji: '📞' }
                ]);

            const row = new ActionRowBuilder().addComponents(adminMenu);
            await interaction.reply({ content: '🛡️ **خيارات الفريق:**', components: [row], flags: MessageFlags.Ephemeral });
        }

        // زر إغلاق التذكرة (طلب التأكيد)
        if (interaction.customId === 'close_ticket') {
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close_ticket').setLabel('تأكيد الإغلاق 🔒').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_close_ticket').setLabel('إلغاء').setStyle(ButtonStyle.Secondary)
            );

            return interaction.reply({
                content: '⚠️ **هل أنت متأكد من رغبتك في إغلاق وحذف هذه التذكرة وترحيل الأرشيف؟**',
                components: [confirmRow],
                flags: MessageFlags.Ephemeral
            });
        }

        if (interaction.customId === 'cancel_close_ticket') {
            return interaction.update({ content: '❌ **تم إلغاء عملية إغلاق التذكرة.**', components: [] });
        }

        // تأكيد الإغلاق وحفظ الـ Transcript
        if (interaction.customId === 'confirm_close_ticket') {
            await interaction.update({ content: '⏳ **جاري حفظ الأرشيف وإغلاق التذكرة...**', components: [] });

            const channel = interaction.channel;
            const ticketOwnerId = channel.topic;

            let fetchedMessages = await channel.messages.fetch({ limit: 100 });
            fetchedMessages = Array.from(fetchedMessages.values()).reverse();

            let transcriptText = `==================================================\n`;
            transcriptText += `TRANSCRIPT FOR TICKET: ${channel.name}\n`;
            transcriptText += `CLOSED BY: ${interaction.user.tag} (${interaction.user.id})\n`;
            transcriptText += `DATE: ${new Date().toLocaleString()}\n`;
            transcriptText += `==================================================\n\n`;

            fetchedMessages.forEach(msg => {
                const time = msg.createdAt.toLocaleString();
                transcriptText += `[${time}] ${msg.author.tag}: ${msg.content}\n`;
                if (msg.attachments.size > 0) {
                    msg.attachments.forEach(att => {
                        transcriptText += `[ATTACHMENT]: ${att.url}\n`;
                    });
                }
            });

            const buffer = Buffer.from(transcriptText, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

            // إرسال رسالة الإغلاق والترانسكريبت لصاحب التذكرة بالخاص
            if (ticketOwnerId && /^\d+$/.test(ticketOwnerId)) {
                try {
                    const owner = await client.users.fetch(ticketOwnerId);
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('📩 | تم إغلاق تذكرتك - THRIVE')
                        .setDescription(
                            `تم إغلاق هذه التذكرة.\n\n` +
                            `نشكرك على تواصلك مع THRIVE. نتمنى أن تكون تجربتك معنا قد نالت رضاك.\n\n` +
                            `في حال احتجت إلى مساعدة أخرى، يمكنك فتح تذكرة جديدة.`
                        )
                        .setColor(0xF5F5DC) // Off-white
                        .setTimestamp();

                    await owner.send({ embeds: [dmEmbed], files: [attachment] });
                } catch (err) {}
            }

            // إرسال النسخة لروم السجلات
            if (CONFIG.TICKET_LOG_CHANNEL_ID) {
                const logChannel = interaction.guild.channels.cache.get(CONFIG.TICKET_LOG_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('📁 سجل إغلاق تذكرة')
                        .addFields(
                            { name: 'اسم التذكرة', value: `\`${channel.name}\``, inline: true },
                            { name: 'صاحب التذكرة', value: (ticketOwnerId && /^\d+$/.test(ticketOwnerId)) ? `<@${ticketOwnerId}>` : 'غير معروف', inline: true },
                            { name: 'تم الإغلاق بواسطة', value: `<@${interaction.user.id}>`, inline: true }
                        )
                        .setColor(0xF5F5DC) // Off-white
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed], files: [attachment] }).catch(() => {});
                }
            }

            const closingEmbed = new EmbedBuilder()
                .setTitle('🔒 | جاري إغلاق التذكرة')
                .setDescription('تم حفظ الأرشيف وسيتم حذف الروم خلال 5 ثوانٍ...')
                .setColor(0xF5F5DC) // Off-white

            await channel.send({ embeds: [closingEmbed] });
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }
    }

    // 2. قائمة خيارات الإدارة (Claim / Call User)
    if (interaction.isStringSelectMenu() && interaction.customId === 'admin_options_menu') {
        const member = interaction.member;
        const isStaff = member.permissions.has(PermissionFlagsBits.Administrator) || CONFIG.STAFF_ROLE_IDS.some(id => member.roles.cache.has(id));
        if (!isStaff) {
            return interaction.reply({ content: '❌ ليس لديك صلاحية.', flags: MessageFlags.Ephemeral });
        }

        const val = interaction.values[0];
        const channel = interaction.channel;
        const ticketOwnerId = channel.topic;

        if (val === 'claim_ticket') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            try {
                for (const roleId of CONFIG.STAFF_ROLE_IDS) {
                    if (roleId && channel.guild.roles.cache.has(roleId)) {
                        await channel.permissionOverwrites.delete(roleId).catch(() => {});
                    }
                }

                await channel.permissionOverwrites.edit(interaction.user.id, { 
                    ViewChannel: true, 
                    SendMessages: true, 
                    AttachFiles: true 
                });

                if (ticketOwnerId && /^\d+$/.test(ticketOwnerId)) {
                    await channel.permissionOverwrites.edit(ticketOwnerId, { 
                        ViewChannel: true, 
                        SendMessages: true, 
                        AttachFiles: true 
                    }).catch(() => {});
                }

                await interaction.editReply({ content: `✅ تم استلام التذكرة بنجاح.` });
                
                // رسالة الإمبيد المطلوبة عند استلام الإداري للتذكرة
                const claimEmbed = new EmbedBuilder()
                    .setDescription(`تم استلام التذكرة من قبل أحد أعضاء فريق THRIVE، وسيتم متابعة طلبك والرد عليك في أقرب وقت ممكن.`)
                    .setColor(0xF5F5DC); // Off-white

                await channel.send({ embeds: [claimEmbed] });
            } catch (err) {
                await interaction.editReply({ content: `❌ حدث خطأ أثناء الاستلام.` });
            }
        }

        if (val === 'cancel_claim') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            try {
                for (const roleId of CONFIG.STAFF_ROLE_IDS) {
                    if (roleId && channel.guild.roles.cache.has(roleId)) {
                        await channel.permissionOverwrites.edit(roleId, { 
                            ViewChannel: true, 
                            SendMessages: true, 
                            AttachFiles: true 
                        }).catch(() => {});
                    }
                }
                await interaction.editReply({ content: `✅ تم إلغاء الاستلام.` });
                await channel.send(`❌ تم إلغاء استلام التذكرة من قبل <@${interaction.user.id}>.`);
            } catch (err) {
                await interaction.editReply({ content: `❌ حدث خطأ.` });
            }
        }

        if (val === 'call_user') {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            if (!ticketOwnerId || !/^\d+$/.test(ticketOwnerId)) {
                return interaction.editReply({ content: '❌ تعذر تحديد صاحب التذكرة!' });
            }

            try {
                const targetUser = await client.users.fetch(ticketOwnerId);
                const callEmbed = new EmbedBuilder()
                    .setTitle('🚨 | استدعاء تذكرة - THRIVE')
                    .setDescription(`طاقم الإدارة يطلب تواجدك فوراً في تذكرتك:\n🔗 <#${channel.id}>`)
                    .setColor(0xF5F5DC); // Off-white

                await targetUser.send({ embeds: [callEmbed] });
                await interaction.editReply({ content: `✅ تم إرسال تنبيه بالخاص إلى <@${targetUser.id}>.` });
            } catch (error) {
                await interaction.editReply({ content: `⚠️ تعذر الإرسال بالخاص، تم منشن العضو في التذكرة.` });
                await channel.send({ content: `<@${ticketOwnerId}>، يرجى التواجد فوراً!` });
            }
        }
    }
});

client.login("MTE5Mjc3NzMzNzAyOTI4Mzg1MA.G9f1a4.YJ2uVgiNo2XnTjULDNMRvUZxFSkKN2CnOes-sk");