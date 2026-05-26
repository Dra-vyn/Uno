const COLORS = ["red", "yellow", "green", "blue"];
const NUMBER_VALUES = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const ACTION_TYPES = ["reverse", "skip", "plus1", "plus2"];
const WILD_TYPES = ["wild", "plus4"];

function buildCard(type, color, value) {
  return {
    id: `${type}-${color || "wild"}-${value}-${
      Math.random().toString(36).slice(2, 8)
    }`,
    type,
    color: color || null,
    value,
    display: type === "number"
      ? value
      : type === "plus1"
      ? "+1"
      : type === "plus2"
      ? "+2"
      : type === "plus4"
      ? "+4"
      : type === "wild"
      ? "Wild"
      : type.charAt(0).toUpperCase() + type.slice(1),
  };
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createDeck() {
  const deck = [];

  COLORS.forEach((color) => {
    NUMBER_VALUES.forEach((value) => {
      deck.push(buildCard("number", color, value));
    });

    ACTION_TYPES.forEach((type) => {
      const value = type === "reverse"
        ? "R"
        : type === "skip"
        ? "S"
        : type === "plus1"
        ? "+1"
        : "+2";
      deck.push(buildCard(type, color, value));
    });
  });

  Array.from({ length: 4 }).forEach(() => {
    deck.push(buildCard("wild", null, "Wild"));
    deck.push(buildCard("plus4", null, "+4"));
  });

  return shuffle(deck);
}

class Game {
  constructor(players, roomId) {
    this.roomId = roomId;
    this.players = players.map((player) => ({
      id: player.id,
      name: player.name,
      hand: [],
      connected: true,
    }));
    this.deck = [];
    this.discard = [];
    this.currentColor = null;
    this.activePlayerIndex = 0;
    this.direction = 1;
    this.currentStack = null;
    this.pendingDraw = null;
    this.statusMessage = "Game is ready.";
    this.winnerId = null;
    this.started = false;
  }

  start() {
    this.deck = createDeck();
    this.discard = [];
    this.currentStack = null;
    this.pendingDraw = null;
    this.winnerId = null;
    this.statusMessage = "Game started.";
    this.started = true;

    this.players.forEach((player) => {
      player.hand = [];
    });

    for (let round = 0; round < 7; round += 1) {
      this.players.forEach((player) => {
        player.hand.push(this.deck.shift());
      });
    }

    let firstCard = this.deck.shift();
    while (firstCard.type !== "number") {
      this.deck.push(firstCard);
      firstCard = this.deck.shift();
    }

    this.discard.push(firstCard);
    this.currentColor = firstCard.color;
    this.activePlayerIndex = Math.floor(Math.random() * this.players.length);
    this.direction = 1;
    this.statusMessage = `${this.players[this.activePlayerIndex].name} starts.`;
  }

  getActivePlayer() {
    return this.players[this.activePlayerIndex];
  }

  findPlayer(playerId) {
    return this.players.find((player) => player.id === playerId);
  }

  getTopCard() {
    return this.discard[this.discard.length - 1];
  }

  replenishDeckIfNeeded() {
    if (this.deck.length === 0) {
      const top = this.discard.pop();
      this.deck = shuffle(this.discard.slice());
      this.discard = [top];
    }
  }

  _drawCards(player, count) {
    const drawn = [];
    for (let i = 0; i < count; i += 1) {
      this.replenishDeckIfNeeded();
      const card = this.deck.shift();
      player.hand.push(card);
      drawn.push(card);
    }
    return drawn;
  }

  _nextIndex(offset = 1) {
    const playerCount = this.players.length;
    let nextIndex = this.activePlayerIndex + offset * this.direction;
    while (nextIndex < 0) nextIndex += playerCount;
    return nextIndex % playerCount;
  }

  _canStack(card) {
    return card.type === "plus2" || card.type === "plus4";
  }

  canPlayCard(card) {
    const top = this.getTopCard();
    if (!card) {
      return false;
    }

    if (this.currentStack) {
      if (this.currentStack.type === "plus2") {
        return card.type === "plus2" || card.type === "plus4";
      }
      if (this.currentStack.type === "plus4") {
        return card.type === "plus4";
      }
      return false;
    }

    if (card.type === "wild" || card.type === "plus4") {
      return true;
    }

    if (card.color === this.currentColor) {
      return true;
    }

    if (card.type !== "number" && top.type === card.type) {
      return true;
    }

    if (
      card.type === "number" && top.type === "number" &&
      card.value === top.value
    ) {
      return true;
    }

    return false;
  }

  _removeCardFromHand(player, cardId) {
    const index = player.hand.findIndex((card) => card.id === cardId);
    if (index < 0) {
      return null;
    }
    return player.hand.splice(index, 1)[0];
  }

  _applyCardEffect(card) {
    if (card.type === "reverse") {
      this.direction *= -1;
      this.statusMessage = `${this.getActivePlayer().name} played Reverse.`;
      return { advance: 1 };
    }

    if (card.type === "skip") {
      this.statusMessage = `${this.getActivePlayer().name} played Skip.`;
      return { advance: 2 };
    }

    if (card.type === "plus1") {
      this.pendingDraw = { amount: 1, skipAfter: true };
      this.statusMessage = `${this.getActivePlayer().name} played +1.`;
      return { advance: 1 };
    }

    if (card.type === "plus2") {
      if (!this.currentStack) {
        this.currentStack = { type: "plus2", amount: 2 };
      } else {
        this.currentStack.amount += 2;
      }
      this.statusMessage = `${this.getActivePlayer().name} stacked +2.`;
      return { advance: 1 };
    }

    if (card.type === "plus4") {
      if (!this.currentStack) {
        this.currentStack = { type: "plus4", amount: 4 };
      } else {
        this.currentStack.amount += 4;
      }
      this.statusMessage = `${this.getActivePlayer().name} played +4.`;
      return { advance: 1 };
    }

    if (card.type === "wild") {
      this.statusMessage = `${this.getActivePlayer().name} played Wild.`;
      return { advance: 1 };
    }

    return { advance: 1 };
  }

  _advanceTurn(steps = 1) {
    this.activePlayerIndex = this._nextIndex(steps);
  }

  playCard(playerId, cardId, chosenColor = null) {
    const player = this.findPlayer(playerId);
    if (!player) {
      return { success: false, message: "Player not found." };
    }

    if (player.id !== this.getActivePlayer().id) {
      return { success: false, message: "It is not your turn." };
    }

    if (
      this.currentStack &&
      !this.canPlayCard(player.hand.find((card) => card.id === cardId))
    ) {
      return {
        success: false,
        message: "You must resolve the current penalty first.",
      };
    }

    const card = this._removeCardFromHand(player, cardId);
    if (!card) {
      return { success: false, message: "Card not found in your hand." };
    }

    if (!this.canPlayCard(card)) {
      player.hand.push(card);
      return { success: false, message: "That card cannot be played now." };
    }

    if ((card.type === "wild" || card.type === "plus4") && !chosenColor) {
      player.hand.push(card);
      return {
        success: false,
        message: "You must choose a color for Wild cards.",
      };
    }

    if (card.type === "wild" || card.type === "plus4") {
      this.currentColor = chosenColor;
      card.color = chosenColor; // record chosen color on the card so discard pile can reflect it
    } else {
      this.currentColor = card.color;
    }

    this.discard.push(card);
    const effect = this._applyCardEffect(card);

    if (player.hand.length === 1) {
      this.statusMessage = `${player.name} has UNO!`;
    }

    if (player.hand.length === 0) {
      this.winnerId = player.id;
      this.statusMessage = `${player.name} wins the game!`;
      return {
        success: true,
        message: this.statusMessage,
        winnerId: player.id,
      };
    }

    this._advanceTurn(effect.advance);

    return { success: true, message: this.statusMessage, winnerId: null };
  }

  playerDraw(playerId) {
    const player = this.findPlayer(playerId);
    if (!player) {
      return { success: false, message: "Player not found." };
    }

    if (player.id !== this.getActivePlayer().id) {
      return { success: false, message: "It is not your turn." };
    }

    if (this.currentStack) {
      const amount = this.currentStack.amount;
      this.currentStack = null;
      this._drawCards(player, amount);
      this.statusMessage = `${player.name} drew ${amount} cards.`;
      this._advanceTurn(1);
      return { success: true, message: this.statusMessage, turnEnded: true };
    }

    if (this.pendingDraw) {
      const amount = this.pendingDraw.amount;
      const skipAfter = this.pendingDraw.skipAfter;
      this.pendingDraw = null;
      this._drawCards(player, amount);
      this.statusMessage = `${player.name} drew ${amount} card${
        amount === 1 ? "" : "s"
      }.`;
      this._advanceTurn(skipAfter ? 2 : 1);
      return { success: true, message: this.statusMessage, turnEnded: true };
    }

    const drawnCard = this._drawCards(player, 1)[0];
    this.statusMessage = `${player.name} drew a card.`;
    // If the drawn card is playable, allow the player to play it (turn continues)
    if (this.canPlayCard(drawnCard)) {
      return {
        success: true,
        message: this.statusMessage,
        drawnCard,
        turnEnded: false,
      };
    }

    // If drawn card is not playable, player must pass and turn advances
    this._advanceTurn(1);
    this.statusMessage = `${player.name} drew a card and passed.`;
    return {
      success: true,
      message: this.statusMessage,
      drawnCard,
      turnEnded: true,
    };
  }

  handleTimeout(playerId) {
    const player = this.findPlayer(playerId);
    if (!player) {
      return { message: "Player not found.", winnerId: null };
    }

    if (this.currentStack) {
      const amount = this.currentStack.amount;
      this.currentStack = null;
      this._drawCards(player, amount);
      this.statusMessage = `${player.name} timed out and drew ${amount} cards.`;
      this._advanceTurn(1);
      return { message: this.statusMessage, winnerId: null };
    }

    if (this.pendingDraw) {
      const amount = this.pendingDraw.amount;
      const skipAfter = this.pendingDraw.skipAfter;
      this.pendingDraw = null;
      this._drawCards(player, amount);
      this.statusMessage = `${player.name} timed out and drew ${amount} card${
        amount === 1 ? "" : "s"
      }.`;
      this._advanceTurn(skipAfter ? 2 : 1);
      return { message: this.statusMessage, winnerId: null };
    }

    const drawnCard = this._drawCards(player, 1)[0];
    if (this.canPlayCard(drawnCard)) {
      this.discard.push(drawnCard);
      // auto-play the drawn card on timeout
      if (drawnCard.type === "wild" || drawnCard.type === "plus4") {
        this.currentColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        drawnCard.color = this.currentColor;
      } else {
        this.currentColor = drawnCard.color;
      }
      const effect = this._applyCardEffect(drawnCard);
      this.statusMessage =
        `${player.name} timed out and auto-played ${drawnCard.display}.`;
      if (player.hand.length === 1) {
        this.statusMessage += " UNO!";
      }
      if (player.hand.length === 0) {
        this.winnerId = player.id;
        return { message: this.statusMessage, winnerId: player.id };
      }
      this._advanceTurn(effect.advance);
      return { message: this.statusMessage, winnerId: null };
    }

    this.statusMessage = `${player.name} timed out and drew a card.`;
    this._advanceTurn(1);
    return { message: this.statusMessage, winnerId: null };
  }

  getPlayerView(playerId) {
    const self = this.findPlayer(playerId);
    return {
      players: this.players.map((player) => ({
        id: player.id,
        name: player.name,
        handSize: player.hand.length,
        connected: player.connected,
        uno: player.hand.length === 1,
      })),
      hand: self ? self.hand : [],
      topCard: this.getTopCard(),
      currentColor: this.currentColor,
      activePlayerId: this.getActivePlayer().id,
      direction: this.direction,
      stack: this.currentStack,
      pendingDraw: this.pendingDraw,
      statusMessage: this.statusMessage,
      winnerId: this.winnerId,
    };
  }
}

module.exports = Game;
