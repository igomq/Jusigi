const legacyGames = require('../services/legacy-games');

module.exports = {
    name: 'LegacyGame',
    command: legacyGames.handle,
    handle: legacyGames.handle,
    makeModal: legacyGames.makeGuessModal,
    customId: legacyGames.customId
};
