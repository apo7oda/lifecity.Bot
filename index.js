const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionsBitField 
} = require('discord.js');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', () => {
    console.log(`✅ Bot is logged in as ${client.user.tag}`);

    const channelId = '1323057959806177424'; // ضع ايدي الغرفة للتكت 
    const channel = client.channels.cache.get(channelId);

    if (!channel) {
        console.error(`❌ Channel with ID ${channelId} not found.`);
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setTitle('🎟️ بانل فتح تــكـــت')
        .setDescription(
            `**قوانين التكت**\n` +
            `> يـجب تـبادل الاحـترام بالـتكت بـينك وبـين الادارة\n` +
            `> عـند فـتح الـتكت يـرجى ذكـر مـشكلتك\n` +
            `> عـند تـرك الـتكت اكـثر من ساعة سـوف سـيتم اغـلاق التـكت\n` +
            `> يـمنع فـتح تـكت بـدون سـبب أو للاسـتهبال\n\n` +
            `اختر النوع المناسب للتكت من القائمة أدناه:`
        )
        .setFooter({ text: 'يرجى اختيار نوع التكت الخاص بك من القائمة أدناه' })
        .setThumbnail('link_logo') // أضف هنا رابط اللوغو
        .setImage('link_banner'); // أضف هنا رابط البانر

    const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('select_ticket_type')
            .setPlaceholder('Select Your Type')
            .addOptions([
                { label: 'Staff Support', value: 'ticket_staff', description: 'للدعم الخاص بالطاقم' },
                { label: 'Owner Support', value: 'ticket_owner', description: 'للدعم الخاص بالمالك' },
                { label: 'Shop Support', value: 'ticket_shop', description: 'للدعم الخاص بالمتجر' }
            ])
    );

    channel.send({ embeds: [embed], components: [selectMenu] }).catch(console.error);
});


const activeTickets = new Map();

client.on('interactionCreate', async (interaction) => {
    if (interaction.isStringSelectMenu()) {
        const { customId, values, user, guild, channel } = interaction;

        if (customId !== 'select_ticket_type') return;

        let categoryId, roleId;
        const ticketType = values[0];

        if (ticketType === 'ticket_staff') {
            categoryId = process.env.CATEGORY_STAFF;
            roleId = process.env.ROLE_STAFF;
        } else if (ticketType === 'ticket_owner') {
            categoryId = process.env.CATEGORY_OWNER;
            roleId = process.env.ROLE_OWNER;
        } else if (ticketType === 'ticket_shop') {
            categoryId = process.env.CATEGORY_SHOP;
            roleId = process.env.ROLE_SHOP;
        } else return;

        try {
            const channelName = `ticket-${user.username}`;
            const ticketChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                    }
                ]
            });

            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle('🎟️ Ticket Created')
                .setDescription('أحد أعضاء الإدارة سيتواصل معك قريبًا. إذا أردت إغلاق التكت، اضغط على الزر أدناه.');

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel('Claim')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('come_ticket')
                    .setLabel('Come')
                    .setStyle(ButtonStyle.Success)
            );

            activeTickets.set(ticketChannel.id, { claimedBy: null, owner: user.id });

            await ticketChannel.send({
                content: `<@${user.id}> <@&${roleId}>`,
                embeds: [embed],
                components: [buttons]
            });

            await interaction.reply({ content: `✅ تم إنشاء التكت الخاص بك: ${ticketChannel}`, ephemeral: true });
        } catch (error) {
            console.error('❌ Failed to create ticket:', error);
            await interaction.reply({ content: '❌ حدث خطأ أثناء إنشاء التكت.', ephemeral: true });
        }
    } else if (interaction.isButton()) {
        const { customId, user, channel } = interaction;

        if (customId === 'claim_ticket') {
            const ticket = activeTickets.get(channel.id);

            if (!ticket) return;
            if (ticket.claimedBy) {
                await interaction.reply({ content: '❌ هذه التذكرة مستلمة بالفعل.', ephemeral: true });
                return;
            }

            if (!interaction.member.roles.cache.has(process.env.CLAIM)) {
                await interaction.reply({ content: '❌ ليس لديك الصلاحية لاستلام هذه التذكرة.', ephemeral: true });
                return;
            }

            ticket.claimedBy = user.id;

            const claimMessage = `**تحياتي لك <@${interaction.user.id}>، أنا الاداري <@${user.id}>. فضلا ان تخبرني ما هو استفسارك / او مشكلتك لتعامل معها.**`;

            const updatedButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('unclaim_ticket')
                    .setLabel('Unclaim')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(false),
                new ButtonBuilder()
                    .setCustomId('come_ticket')
                    .setLabel('Come')
                    .setStyle(ButtonStyle.Success)
            );

            await channel.send({ content: claimMessage });
            await interaction.update({ components: [updatedButtons] });
        } else if (customId === 'come_ticket') {
            const ticket = activeTickets.get(channel.id);

            if (!ticket) {
                await interaction.reply({ content: '❌ هذه التذكرة غير مسجلة في النظام.', ephemeral: true });
                return;
            }

            try {
                const ticketOwner = await interaction.guild.members.fetch(ticket.owner);

                const embed = new EmbedBuilder()
                    .setColor(0x00AE86)
                    .setTitle('📩 تم استدعاؤك في التذكرة!')
                    .setDescription(
                        `لقد تم استدعاؤك في تذكرتك.\n` +
                        `يرجى التوجه إلى التذكرة الخاصة بك قبل أن يتم حذفها.\n\n` +
                        `🔗 [اذهب إلى التذكرة](https://discord.com/channels/${interaction.guild.id}/${channel.id})`
                    )
                    .setFooter({ text: 'شكرا للتفهمك' });

                await ticketOwner.send({ embeds: [embed] });

                await interaction.reply({ content: `✅ تم استدعاء <@${ticketOwner.id}> إلى التذكرة.`, ephemeral: false });
            } catch (error) {
                console.error('❌ Failed to send DM:', error);
                await interaction.reply({
                    content: '❌ تعذر إرسال رسالة خاصة إلى المستخدم. ربما قام بتعطيل استقبال الرسائل.',
                    ephemeral: false
                });
            }
        } else if (customId === 'unclaim_ticket') {
            const ticket = activeTickets.get(channel.id);

            if (!ticket || ticket.claimedBy !== user.id) {
                await interaction.reply({ content: '❌ لا يمكنك إلغاء استلام تذكرة لست مستلمها.', ephemeral: true });
                return;
            }

            ticket.claimedBy = null;

            const updatedButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel('Claim')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Close Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('come_ticket')
                    .setLabel('Come')
                    .setStyle(ButtonStyle.Success)
            );

            await interaction.reply({ content: `✅ لقد قمت بسحب استلامك للتذكرة.`, ephemeral: true });
            await interaction.message.edit({ components: [updatedButtons] });
        }         else if (customId === 'close_ticket') {
            const ticket = activeTickets.get(channel.id);

            if (!ticket) {
                await interaction.reply({ content: '❌ هذه التذكرة غير مسجلة في النظام.', ephemeral: true });
                return;
            }

            if (ticket.claimedBy !== user.id && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                await interaction.reply({ content: '❌ لا يمكنك إغلاق هذه التذكرة. فقط المستلم أو المسؤول يمكنه ذلك.', ephemeral: true });
                return;
            }

            await interaction.reply({ content: '⚠️ سيتم إغلاق التذكرة خلال 5 ثوانٍ...', ephemeral: false });

            setTimeout(async () => {
                try {
                    await channel.delete();
                    activeTickets.delete(channel.id);
                } catch (error) {
                    console.error('❌ Failed to delete channel:', error);
                }
            }, 5000);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);