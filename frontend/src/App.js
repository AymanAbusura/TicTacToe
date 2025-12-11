import React, { useState } from 'react';
import { Sparkles, RefreshCw, Heart, Trophy } from 'lucide-react';
import './TicTacToe.css';

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameStatus, setGameStatus] = useState('playing');
  const [promoCode, setPromoCode] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [chatId, setChatId] = useState('');
  const [showSettings, setShowSettings] = useState(true);

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const sendResultToBackend = async (result, promoCode = '') => {
    if (!chatId) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/game/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, promoCode, chatId })
      });

      const data = await response.json();
      console.log('Backend response:', data);
    } catch (error) {
      console.error('Error sending result to backend:', error);
    }
  };

  const checkWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    for (let line of lines) {
      const [a, b, c] = line;
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line };
      }
    }

    if (squares.every(square => square !== null)) {
      return { winner: 'draw', line: null };
    }

    return { winner: null, line: null };
  };

  const minimax = (squares, depth, isMaximizing) => {
    const result = checkWinner(squares);
    
    if (result.winner === 'O') return 10 - depth;
    if (result.winner === 'X') return depth - 10;
    if (result.winner === 'draw') return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'O';
          let score = minimax(squares, depth + 1, false);
          squares[i] = null;
          bestScore = Math.max(score, bestScore);
        }
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (let i = 0; i < 9; i++) {
        if (squares[i] === null) {
          squares[i] = 'X';
          let score = minimax(squares, depth + 1, true);
          squares[i] = null;
          bestScore = Math.min(score, bestScore);
        }
      }
      return bestScore;
    }
  };

  const getBestMove = (squares) => {
    let bestScore = -Infinity;
    let bestMove = null;

    for (let i = 0; i < 9; i++) {
      if (squares[i] === null) {
        squares[i] = 'O';
        let score = minimax(squares, 0, false);
        squares[i] = null;
        if (score > bestScore) {
          bestScore = score;
          bestMove = i;
        }
      }
    }

    return bestMove;
  };

  const handleClick = (index) => {
    if (board[index] || !isPlayerTurn || gameStatus !== 'playing') return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    setIsPlayerTurn(false);

    const result = checkWinner(newBoard);
    if (result.winner) {
      handleGameEnd(result.winner, newBoard);
      return;
    }

    setTimeout(() => {
      const aiMove = getBestMove(newBoard);
      if (aiMove !== null) {
        newBoard[aiMove] = 'O';
        setBoard(newBoard);
        
        const aiResult = checkWinner(newBoard);
        if (aiResult.winner) {
          handleGameEnd(aiResult.winner, newBoard);
        } else {
          setIsPlayerTurn(true);
        }
      }
    }, 500);
  };

  const handleGameEnd = (winner, finalBoard) => {
    setGameStatus(winner);

    if (winner === 'X') {
      const code = generatePromoCode();
      setPromoCode(code);
      sendResultToBackend('win', code);
    } else if (winner === 'O') {
      sendResultToBackend('lose');
    } else {
      sendResultToBackend('draw');
    }

    setShowModal(true);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setGameStatus('playing');
    setPromoCode('');
    setShowModal(false);
  };

  // const startGame = () => {
  //   if (chatId) {
  //     setShowSettings(false);
  //   }
  // };

  const startGame = async () => {
    if (!chatId) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/test-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      });
      const data = await res.json();

      if (data.success) {
        setShowSettings(false);
      } else {
        alert("Пожалуйста, отправьте /start нашему боту в Telegram, чтобы получать промокоды.");
      }
    } catch (error) {
      console.error(error);
      alert("Ошибка подключения к боту. Попробуйте снова.");
    }
  };

  if (showSettings) {
    return (
      <div className="container">
        <div className="settings-card">
          <div className="settings-header">
            <Heart className="settings-icon" />
            <h1 className="settings-title">Настройка Telegram</h1>
            <p className="settings-subtitle">Введите ваш Chat ID</p>
          </div>
          
          <div>
            <div className="input-group">
              <label className="input-label">Chat ID</label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="123456789"
                className="input-field"
              />
            </div>
            
            <div className="info-box">
              <p className="info-title">Как получить Chat ID:</p>
              <ol className="info-list">
                <li>Найдите свой Chat ID через @userinfobot</li>
              </ol>
            </div>
            
            <button
              onClick={startGame}
              disabled={!chatId}
              className="btn-primary"
            >
              Начать игру
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="game-container">
        <div className="game-header">
          <div className="game-title-wrapper">
            <Sparkles className="sparkle-icon sparkle-purple" />
            <h1 className="game-title">Крестики-нолики</h1>
            <Sparkles className="sparkle-icon sparkle-pink" />
          </div>
          <p className="game-subtitle">Сыграйте и выиграйте промокод!</p>
        </div>

        <div className="game-card">
          <div className="board">
            {board.map((cell, index) => (
              <button
                key={index}
                onClick={() => handleClick(index)}
                disabled={!isPlayerTurn || gameStatus !== 'playing'}
                className={`cell ${
                  cell === 'X' ? 'cell-x' : cell === 'O' ? 'cell-o' : 'cell-empty'
                }`}
              >
                {cell === 'X' && <Heart className="heart-icon" />}
                {cell === 'O' && '★'}
              </button>
            ))}
          </div>

          <div className="game-status">
            <p className="status-text">
              {gameStatus === 'playing' 
                ? (isPlayerTurn ? '💕 Ваш ход' : '⭐ Ход компьютера...')
                : ''}
            </p>
            
            <button onClick={resetGame} className="btn-reset">
              <RefreshCw className="refresh-icon" />
              Новая игра
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            {gameStatus === 'X' ? (
              <div>
                <Trophy className="trophy-icon" />
                <h2 className="modal-title">Поздравляем! 🎉</h2>
                <p className="modal-text">Вы победили! Ваш промокод:</p>
                <div className="promo-box">
                  <p className="promo-code">{promoCode}</p>
                </div>
                <p className="modal-note">Промокод отправлен в Telegram</p>
                <button onClick={resetGame} className="btn-primary">
                  Сыграть ещё раз
                </button>
              </div>
            ) : gameStatus === 'O' ? (
              <div>
                <div className="emoji-large">😔</div>
                <h2 className="modal-title">Не расстраивайтесь!</h2>
                <p className="modal-text">В следующий раз обязательно повезёт!</p>
                <button onClick={resetGame} className="btn-primary">
                  Попробовать снова
                </button>
              </div>
            ) : (
              <div>
                <div className="emoji-large">🤝</div>
                <h2 className="modal-title">Ничья!</h2>
                <p className="modal-text">Отличная игра! Попробуем ещё раз?</p>
                <button onClick={resetGame} className="btn-primary">
                  Сыграть ещё раз
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicTacToe;