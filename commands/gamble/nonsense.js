const fs = require('fs');
const { join } = require('path');
const OpenAI = require('openai');
const {SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder} = require("discord.js");

const data = new SlashCommandBuilder()
    .setName('넌센스')
    .setDescription('넌센스 퀴즈를 시작합니다. 5지선다 형식으로 구성되어 있습니다. AI가 만들어서 퀴즈 퀄리티가 낮을 가능성이 있습니다.')
    .addIntegerOption(option =>
        option.setName("금액")
            .setDescription("베팅할 금액을 입력하세요.")
            .setRequired(true)
    );

const User = require("../../models/User");
const {ButtonStyle} = require("discord-api-types/v10");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const QUIZ_FILE_PATH = join(__dirname, '..', '..', 'data', 'nonsense_quiz.json');
const MIN_QUIZ_COUNT = 3; // 퀴즈가 3개 이하로 떨어지면 새로 받아옴

module.exports.data = data;
module.exports.command = async (client, interaction, user) => {
    if (!await User.isUserExists(user.id))
        return await replyEphemeral(interaction, { content: '먼저 `/가입` 명령어로 가입해주세요.' });

    const betting = interaction.options.getInteger("금액");

    const userData = await User.GetUser(user.id);

    if (gameInfo[`NS-${user.id}`]) return await replyEphemeral(interaction, { content: '이미 진행중인 베팅이 있습니다.' });

    if (betting <= 0) return await replyEphemeral(interaction, { content: '0보다 큰 올바른 금액을 입력해 주세요.' });
    else if (betting < 100000) return await replyEphemeral(interaction, { content: '최소 100,000<:jusigi_coin:1136308344999653427>를 베팅해야 합니다.' });
    else if (betting > userData.purse) return await replyEphemeral(interaction, { content: '보유 자산보다 더 베팅할 수 없습니다.' });

    await interaction.deferReply();
    const quiz = await getRandomQuiz();
    console.log(quiz);

    const Question = quiz['문제'];
    const Choices = quiz['선택지'];
    const AnswerIndex = quiz['정답'];
    const Comment = quiz['해설'];
    const Hints = quiz['힌트'];

    activities.set(`NS-${user.id}`, interaction);
    gameInfo[`NS-${user.id}`] = {
        answerIndex: AnswerIndex,
        hints: Hints,
        comment: Comment,
        usedHints: 0,
        betting: betting
    };

    const Embed = new EmbedBuilder()
        .setAuthor({name: user.tag, iconURL: user.displayAvatarURL()})
        .setTitle(Question)
        .setDescription('5지선다형 퀴즈입니다. 아래 번호에 해당하는 버튼을 눌러 답변해주세요!')
        .setColor('#a2ff00')
        .addFields(
            { name: '정보', value: `베팅 금액: ${commaByThree(betting)}시기`, inline: true },
            { name: '\u200b', value: `성공 시: ${commaByThree(betting * 2)}시기`, inline: true },
            { name: '\u200b', value: '\u200b' }
        )

    Choices.forEach(text => {
        const idx = Choices.indexOf(text);
        Embed.addFields({ name: `${idx + 1}번`, value: text, inline: true });
    })

    const ChoiceButtonRow = new ActionRowBuilder()
    for (let i = 1; i <= Choices.length; i++) {
        ChoiceButtonRow.addComponents(
            new ButtonBuilder()
                .setCustomId(JSON.stringify({name: 'NonsenseButton', userId: user.id, action: `${i}`}))
                .setLabel(`${i}번`)
                .setStyle(ButtonStyle.Primary)
        )
    }
    const OptionButtonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(JSON.stringify({name: 'NonsenseButton', userId: user.id, action: 'hint'}))
            .setLabel('힌트보기')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(JSON.stringify({name: 'NonsenseButton', userId: user.id, action: 'stop'}))
            .setLabel('그만할래요')
            .setStyle(ButtonStyle.Danger)
    )

    await interaction.editReply({
        embeds: [Embed],
        components: [ChoiceButtonRow, OptionButtonRow]
    });
}

const queryQuizBody = {
    model: "gpt-5-nano",
    reasoning_effort: "minimal",
    messages: [
        { role: 'system', content: 'You are a non-sense quiz master skilled in Korean punning and word play. You must make a short and impactful quiz to make users feel excited.' },
        { role: 'user', content:
                '한국어로 된 넌센스 퀴즈 10개를 만들어주세요.\n' +
                '각 퀴즈는 다음 형식을 따라야 합니다:\n' +
                '[\n' +
                '  {\n' +
                '    "문제": "넌센스 퀴즈 문제",\n' +
                '    "선택지": ["오답1", "오답2", "정답", "오답3", "오답4"],\n' +
                '    "정답": 2,\n' +
                '    "해설": "퀴즈 정답 해설"' +
                '    "힌트": ["첫 번째 힌트 (오답 1개 제거)", "두 번째 힌트 (오답 1개 더 제거)"]\n' +
                '  },\n' +
                '  ...\n' +
                ']\n' +
                '- 선택지는 반드시 5개여야 하며, 정답은 선택지 배열 내 무작위 위치에 있어야 합니다.\n' +
                '- 정답은 선택지 배열에서 정답의 인덱스(0~4)입니다.\n' +
                '- 해설은 정답에 대한 간단한 설명입니다.\n' +
                '- 힌트는 2개이며, 각 힌트는 오답을 하나씩 제거하는 내용입니다.\n' +
                '- 힌트에는 어떤 오답을 제거하는 내용인지 포함하지 마세요. 단순히 힌트 내용만 포함해야 합니다.\n' +
                '- 문제에는 언어유희·말장난을 반드시 포함하며 짧고 재미있어야 하며, 난이도는 어려움 정도로 설정하세요.\n' +
                '- JSON 형식만 반환하고, 마크다운이나 추가 설명은 포함하지 마세요.\n'
        }
    ]
};

const loadQuizzes = () => {
    if (!fs.existsSync(QUIZ_FILE_PATH)) {
        return [];
    }
    try {
        const data = fs.readFileSync(QUIZ_FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error('넌센스 퀴즈 파일 읽기 오류:', e);
        return [];
    }
};
const saveQuizzes = (quizzes) => {
    fs.writeFileSync(QUIZ_FILE_PATH, JSON.stringify(quizzes, null, 4));
};
const fetchNewQuizzes = async () => {
    console.log('새로운 넌센스 퀴즈 10개를 받아오는 중...');
    try {
        const completion = await openai.chat.completions.create(queryQuizBody);
        const content = completion.choices[0].message.content.trim();
        const newQuizzes = JSON.parse(content);

        console.log(`넌센스 퀴즈 ${newQuizzes.length}개 받아오기 완료`);
        return newQuizzes;
    } catch (e) {
        console.error('넌센스 퀴즈 받아오기 실패:', e);
        return [];
    }
};
const getRandomQuiz = async () => {
    let quizzes = loadQuizzes();

    if (quizzes.length <= MIN_QUIZ_COUNT) {
        const newQuizzes = await fetchNewQuizzes();
        quizzes = [...quizzes, ...newQuizzes];
        saveQuizzes(quizzes);
    }

    if (quizzes.length === 0) {
        throw new Error('사용 가능한 퀴즈가 없습니다.');
    }

    const randomIndex = Math.floor(Math.random() * quizzes.length);
    const selectedQuiz = quizzes[randomIndex];
    quizzes.splice(randomIndex, 1);
    saveQuizzes(quizzes);

    return selectedQuiz;
};

module.exports.commandName = '넌센스';