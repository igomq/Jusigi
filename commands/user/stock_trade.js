const { SlashCommandBuilder } = require('discord.js');
const {CommandLabels} = require("../../app");
const {queryStockHistory} = require("../../util/query_data");
const data = new SlashCommandBuilder()
    .setName('거래')
    .setDescription('주식을 거래합니다.')
    .addSubcommand(subcommand =>
        subcommand.setName('매수')
            .setDescription('주식을 매수합니다.')
            .addStringOption(option =>
                option.setName('종목')
                    .setDescription('매수할 종목을 입력해주세요.')
                    .setRequired(true)
            ).addStringOption(option =>
            option.setName('수량')
                .setDescription('매도할 수량을 입력해주세요.')
                .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand.setName('매도')
            .setDescription('주식을 매도합니다.')
            .addStringOption(option =>
                option.setName('종목')
                    .setDescription('매도할 종목을 입력해주세요.')
                    .setRequired(true)
            ).addStringOption(option =>
                option.setName('수량')
                    .setDescription('매도할 수량을 입력해주세요.')
                    .setRequired(true)
        )
    );

const User = require('../../models/User');
const Bank = require('../../models/Bank');
const Stock = require('../../models/Stock');
const { MessageFlags } = require("discord-api-types/v10");

require('../../data/stock_labels.json').labels
    .forEach(cat => { data.options[0].options[0].addChoices({name: cat, value: cat}); })

require('../../data/stock_labels.json').labels
    .forEach(cat => { data.options[1].options[0].addChoices({name: cat, value: cat}); })

module.exports.data = data
module.exports.command = async (client, interaction, user) => {
    if (!await User.isUserExists(user.id))
        return await interaction.reply({ content: '회원가입이 되어있지 않아 실행할 수 없습니다.\n> 재미있는 주시기 봇을 즐기려면 `/가입`명령어로 주시기 봇에 가입하세요!', flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand()
    let amount       = interaction.options.getString('수량')
    const label      = interaction.options.getString('종목')

    const CUR = queryStockHistory(label).at(-1);

    // Get user and stock models
    const userModel = await User.GetUser(user.id);
    const stockModel = await Stock.GetUser(user.id);

    const Purse = userModel.purse;

    // Check the validity of amount
    if (isNaN(amount) && amount !== '올인') return await interaction.reply({ content: '수량은 숫자나 올인으로 입력해주세요.', flags: MessageFlags.Ephemeral });
    else if (parseInt(amount) <= 0) return await interaction.reply({ content: '수량은 1 이상으로 입력해주세요.', flags: MessageFlags.Ephemeral });

    if (subcommand === '매수') {
        if (CUR * amount > Purse) return await interaction.reply({ content: '잔액이 부족합니다.', flags: MessageFlags.Ephemeral });

        if (amount === '올인') amount = Math.floor(Purse / CUR);

        // Update user purse
        userModel.purse = Purse - (CUR * amount);

        // Update stock holdings
        if (stockModel.stock[label]) {
            // Calculate new average price
            const existingData = stockModel.stock[label];
            const newTotalShares = existingData.amount + parseInt(amount);
            const newAvgPrice = (existingData.price * existingData.amount + CUR * parseInt(amount)) / newTotalShares;
            
            stockModel.stock = {
                stock: label,
                amount: newTotalShares,
                price: newAvgPrice
            };
        } else {
            stockModel.stock = {
                stock: label,
                amount: parseInt(amount),
                price: CUR
            };
        }

        // Apply changes to database
        await userModel.apply();
        await stockModel.apply();
    }
    else {
        // Check if user has the stock
        if (!stockModel.stock[label]) 
            return await interaction.reply({ content: '해당 종목을 보유하고 있지 않습니다.', flags: MessageFlags.Ephemeral });
        
        const stockData = stockModel.stock[label];
        
        // Check if user has enough shares
        if (stockData.amount < amount && amount !== '올인') 
            return await interaction.reply({ content: '보유한 주식의 수량보다 많은 주식을 매도할 수 없습니다.', flags: MessageFlags.Ephemeral });

        // Check if 1 hour has passed since purchase (if date field exists)
        if (stockData.date && Date.now() - stockData.date < 3600000) 
            return await interaction.reply({ content: '매수한 지 1시간이 지나지 않아 판매할 수 없습니다.', flags: MessageFlags.Ephemeral });

        if (amount === '올인') amount = stockData.amount;
        amount = parseInt(amount);

        // Update user purse
        userModel.purse = Purse + (CUR * amount);

        // Update stock holdings
        const remainingShares = stockData.amount - amount;
        
        if (remainingShares === 0) {
            // Remove stock completely by setting amount to 0
            stockModel.stock = {
                stock: label,
                amount: -amount,
                price: 0
            };
        } else {
            // Update remaining shares with adjusted average price
            const newAvgPrice = (stockData.price * stockData.amount - CUR * amount) / remainingShares;
            
            stockModel.stock = {
                stock: label,
                amount: -amount,
                price: newAvgPrice
            };
        }

        // Apply changes to database
        await userModel.apply();
        await stockModel.apply();
    }

    await interaction.reply('거래가 완료되었습니다!');
}
module.exports.commandName = '거래'