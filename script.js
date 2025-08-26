
document.addEventListener('DOMContentLoaded', () => {
    const addPlayerButton = document.querySelector('.js-add-player-button');
    const playersList = document.querySelector('.players__list');
    const transactionFromPlayerSelect = document.querySelector('.js-transaction-from-player');
    const transactionToPlayerSelect = document.querySelector('.js-transaction-to-player');
    const transactionAmountInput = document.querySelector('.js-transaction-amount');
    const transactionSubmitButton = document.querySelector('.js-transaction-submit');
    const transactionHistoryList = document.querySelector('.js-transaction-history-list');
    const continueGameButton = document.getElementById('continueGame');
    const newGameButton = document.getElementById('newGame');
    const gameLoadOptions = document.getElementById('gameLoadOptions');
    const gameBoard = document.getElementById('gameBoard');
    const transactionUnitSelect = document.querySelector('.js-transaction-unit');

    const rulesButton = document.getElementById('rulesButton');
    const rulesModal = document.getElementById('rulesModal');
    const closeButton = document.querySelectorAll('.close');

    const playerRemovedModal = document.getElementById('playerRemovedModal');
    const playerRemovedMessage = document.getElementById('playerRemovedMessage');

    let players = []; // Массив для хранения информации об игроках
    let actionHistory = []; // Массив для хранения истории действий (переименовано)

    const LOCAL_STORAGE_KEY = 'monopoly_game_data';
    const MAX_NAME_LENGTH = 15;
    const INITIAL_PLAYERS = 2;

    const showMessage = (message) => {
        alert(message);
    };

    const showGameBoard = () => {
        gameLoadOptions.style.display = 'none';
        gameBoard.style.display = 'flex';
    };

    const showLoadOptions = () => {
        gameLoadOptions.style.display = 'flex';
        gameBoard.style.display = 'none';
    };

    const showPlayerRemovedModal = (playerName) => {
        playerRemovedMessage.textContent = `${playerName} банкрот! Остаток средств: 0`;
        playerRemovedModal.style.display = 'block';
    };

    const loadGameData = () => {
        const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            if (parsedData.players && parsedData.players.length > 0) {
                players = parsedData.players;
                actionHistory = parsedData.actionHistory || []; // Загрузка истории действий
                renderPlayers();
                renderActionHistory(); // Обновление отображения истории
                showGameBoard();
                return true;
            }
        }
        return false;
    };

    const saveGameData = () => {
        const gameData = {
            players: players,
            actionHistory: actionHistory // Сохранение истории действий
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameData));
    };

    const clearGameData = () => {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    };

    const createPlayer = (name) => {
        return {
            id: Date.now(),
            name: name,
            balance: 15000000
        };
    };

    const addPlayer = (name) => {
        const newPlayer = createPlayer(name);
        players.push(newPlayer);

        // Добавление записи в историю действий
        recordAction(`${name} добавлен в игру`);

        renderPlayers();
        saveGameData();
    };

    const renderPlayers = () => {
        playersList.innerHTML = '';
        transactionFromPlayerSelect.innerHTML = '<option value="" disabled selected>От кого</option>';
        transactionToPlayerSelect.innerHTML = '<option value="" disabled selected>Кому</option>';

        players.forEach(player => {
            const listItem = document.createElement('li');
            listItem.classList.add('players__list-item');
            listItem.innerHTML = `
                <span>${player.name}</span>
                <span>${player.balance.toLocaleString()} монет</span>
            `;
            playersList.appendChild(listItem);

            const fromOption = document.createElement('option');
            fromOption.value = player.id;
            fromOption.textContent = player.name;
            transactionFromPlayerSelect.appendChild(fromOption);

            const toOption = document.createElement('option');
            toOption.value = player.id;
            toOption.textContent = player.name;
            transactionToPlayerSelect.appendChild(toOption);
        });
    };

    // Функция для записи действия в историю
    const recordAction = (description) => {
        const action = {
            description: description,
            timestamp: new Date().toLocaleString()
        };
        actionHistory.push(action);
        renderActionHistory();
        saveGameData();
    };

    const recordTransaction = (fromPlayerId, toPlayerId, amount) => {
        const fromPlayer = players.find(player => player.id === parseInt(fromPlayerId));
        const toPlayer = players.find(player => player.id === parseInt(toPlayerId));

        // Запрет перевода самому себе
        if (fromPlayerId === toPlayerId) {
            showMessage('Нельзя переводить деньги самому себе.');
            return;
        }


        const unit = parseInt(transactionUnitSelect.value);

        if (!fromPlayer || !toPlayer || isNaN(amount)) {
            showMessage('Некорректные данные транзакции.');
            return;
        }

        let amountNumber = parseInt(amount, 10) * unit;

        if (isNaN(amountNumber)) {
            showMessage('Пожалуйста, введите сумму в миллионах или тысячах.');
            return;
        }

        if (amountNumber <= 0) {
            showMessage('Пожалуйста, введите положительную сумму.');
            return;
        }

        let actualTransferAmount = amountNumber;

        if (fromPlayer.balance < amountNumber) {
            actualTransferAmount = fromPlayer.balance;
        }


        fromPlayer.balance -= amountNumber; // Списание средств. Теперь баланс может быть отрицательным
        toPlayer.balance += actualTransferAmount;

        // Запись транзакции в историю действий
        recordAction(`${fromPlayer.name} перевел ${actualTransferAmount.toLocaleString()} монет игроку ${toPlayer.name}`);


        renderPlayers();
        saveGameData();

        // Проверяем, нужно ли удалять игрока. Если баланс игрока, совершившего перевод, стал меньше -5000000
        if (fromPlayer.balance <= -5000000) {
            removePlayer(fromPlayer);
        }

        if (toPlayer.balance <= -5000000) {
            removePlayer(toPlayer);
        }



    };

    // Функция для удаления игрока из игры
    const removePlayer = (playerToRemove) => {
        const playerName = playerToRemove.name;
        playerToRemove.balance = 0;
        renderPlayers();

        players = players.filter(player => player.id !== playerToRemove.id);
        renderPlayers();

        if(transactionFromPlayerSelect.querySelector(`[value="${playerToRemove.id}"]`)){
            transactionFromPlayerSelect.querySelector(`[value="${playerToRemove.id}"]`).remove();
        }
        if(transactionToPlayerSelect.querySelector(`[value="${playerToRemove.id}"]`)){
            transactionToPlayerSelect.querySelector(`[value="${playerToRemove.id}"]`).remove();
        }

        showPlayerRemovedModal(playerToRemove.name);

        // Запись об удалении игрока в историю действий
        recordAction(`${playerName} выбыл из игры (банкрот)`);
    }


    // Функция для отображения истории действий
    const renderActionHistory = () => {
        transactionHistoryList.innerHTML = ''; // Используем тот же элемент, что и для истории транзакций (переименован)
        actionHistory.forEach(action => {
            const listItem = document.createElement('li');
            listItem.classList.add('transaction__history-item');
            listItem.textContent = `${action.timestamp}: ${action.description}`;
            transactionHistoryList.appendChild(listItem);
        });
    };

    const initializeNewGame = () => {
        clearGameData();
        players = [];
        actionHistory = []; // Очищаем историю действий при начале новой игры

        for (let i = 0; i < INITIAL_PLAYERS; i++) {
            let playerName = prompt(`Введите имя игрока ${i + 1}:`);
            if (!playerName) {
                playerName = `Игрок ${i + 1}`;
            }
            addPlayer(playerName.substring(0, MAX_NAME_LENGTH));
        }

        renderPlayers();
        renderActionHistory();
        showGameBoard();
    };


    addPlayerButton.addEventListener('click', () => {
        let playerName = prompt("Введите имя нового игрока:");
        if (playerName) {
            addPlayer(playerName.substring(0, MAX_NAME_LENGTH));
        }
    });

    transactionSubmitButton.addEventListener('click', () => {
        const fromPlayerId = transactionFromPlayerSelect.value;
        const toPlayerId = transactionToPlayerSelect.value;
        const amount = transactionAmountInput.value;

        if (fromPlayerId && toPlayerId && amount) {
            recordTransaction(fromPlayerId, toPlayerId, amount);
            transactionAmountInput.value = '';
        } else {
            showMessage('Пожалуйста, заполните все поля транзакции.');
        }
    });

    continueGameButton.addEventListener('click', () => {
        if (!loadGameData()) {
            showMessage("Нет сохраненной игры для продолжения.  Начните новую игру.");
        }
    });

    newGameButton.addEventListener('click', () => {
        initializeNewGame();
    });


    rulesButton.addEventListener('click', () => {
        rulesModal.style.display = 'block';
    });

    closeButton.forEach(button => {
        button.addEventListener('click', () => {
            rulesModal.style.display = 'none';
            playerRemovedModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target == rulesModal) {
            rulesModal.style.display = 'none';
        }
        if (event.target == playerRemovedModal) {
            playerRemovedModal.style.display = 'none';
        }
    });


    if (localStorage.getItem(LOCAL_STORAGE_KEY)) {
        showLoadOptions();
    } else {
        initializeNewGame();
    }

});