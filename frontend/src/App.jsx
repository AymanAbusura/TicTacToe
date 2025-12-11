import React, { useState } from 'react';
import { Sparkles, RefreshCw, Heart, Trophy, Settings, Info, Copy, Check } from 'lucide-react';

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameStatus, setGameStatus] = useState('playing');
  const [promoCode, setPromoCode] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [userCode, setUserCode] = useState('');
  const [showSettings, setShowSettings] = useState(true);
  const [winningLine, setWinningLine] = useState(null);
  const [stats, setStats] = useState({ wins: 0, losses: 0, draws: 0 });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [copied, setCopied] = useState(false);

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const verifyUserCode = async (code) => {
    if (!code || code.length !== 6) {
      setVerificationError('Код должен содержать 6 символов');
      return false;
    }

    setIsVerifying(true);
    setVerificationError('');

    try {
      const API_URL = 'http://localhost:3005';
      
      const response = await fetch(`${API_URL}/api/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsVerifying(false);
        return true;
      } else {
        setVerificationError(data.error || 'Неверный код. Проверьте код из бота.');
        setIsVerifying(false);
        return false;
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      setVerificationError('Ошибка подключения к серверу');
      setIsVerifying(false);
      return false;
    }
  };

  const sendResultToBackend = async (result, promoCode = '') => {
    if (!userCode) return;

    try {
      const API_URL = 'http://localhost:3005';
      
      const response = await fetch(`${API_URL}/api/game/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, promoCode, userCode: userCode.toUpperCase() })
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
      handleGameEnd(result.winner, result.line, newBoard);
      return;
    }

    setTimeout(() => {
      const aiMove = getBestMove(newBoard);
      if (aiMove !== null) {
        newBoard[aiMove] = 'O';
        setBoard(newBoard);
        
        const aiResult = checkWinner(newBoard);
        if (aiResult.winner) {
          handleGameEnd(aiResult.winner, aiResult.line, newBoard);
        } else {
          setIsPlayerTurn(true);
        }
      }
    }, 500);
  };

  const handleGameEnd = (winner, line, finalBoard) => {
    setGameStatus(winner);
    setWinningLine(line);

    const newStats = { ...stats };
    
    if (winner === 'X') {
      const code = generatePromoCode();
      setPromoCode(code);
      sendResultToBackend('win', code);
      newStats.wins += 1;
    } else if (winner === 'O') {
      sendResultToBackend('lose');
      newStats.losses += 1;
    } else {
      sendResultToBackend('draw');
      newStats.draws += 1;
    }

    setStats(newStats);
    setTimeout(() => setShowModal(true), 300);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setGameStatus('playing');
    setPromoCode('');
    setShowModal(false);
    setWinningLine(null);
  };

  const startGame = async () => {
    const isValid = await verifyUserCode(userCode);
    if (isValid) {
      setShowSettings(false);
    }
  };

  const backToSettings = () => {
    setShowSettings(true);
    resetGame();
  };

  const copyPromoCode = () => {
    navigator.clipboard.writeText(promoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    settingsCard: {
      background: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '24px',
      padding: '40px',
      maxWidth: '500px',
      width: '100%',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      animation: 'fadeIn 0.5s ease'
    },
    settingsHeader: {
      textAlign: 'center',
      marginBottom: '32px'
    },
    iconWrapper: {
      width: '80px',
      height: '80px',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 20px',
      animation: 'pulse 2s ease-in-out infinite'
    },
    settingsIcon: {
      color: 'white',
      width: '40px',
      height: '40px'
    },
    settingsTitle: {
      fontSize: '32px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      marginBottom: '12px'
    },
    settingsSubtitle: {
      fontSize: '16px',
      color: '#666',
      lineHeight: '1.6'
    },
    settingsBody: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    },
    inputLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#444',
      display: 'flex',
      alignItems: 'center'
    },
    inputField: {
      padding: '14px 16px',
      fontSize: '16px',
      border: '2px solid #e0e0e0',
      borderRadius: '12px',
      outline: 'none',
      transition: 'all 0.3s ease',
      textTransform: 'uppercase',
      letterSpacing: '2px',
      fontWeight: '600',
      textAlign: 'center'
    },
    errorText: {
      color: '#f5576c',
      fontSize: '14px',
      marginTop: '4px',
      fontWeight: '500'
    },
    infoBox: {
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      borderRadius: '16px',
      padding: '24px',
      border: '1px solid #e0e0e0'
    },
    infoText: {
      fontSize: '14px',
      color: '#333',
      marginBottom: '12px',
      lineHeight: '1.6'
    },
    infoList: {
      fontSize: '14px',
      color: '#555',
      lineHeight: '1.8',
      paddingLeft: '20px',
      marginBottom: '16px'
    },
    divider: {
      height: '1px',
      background: 'linear-gradient(90deg, transparent, #ddd, transparent)',
      margin: '20px 0'
    },
    botLink: {
      display: 'inline-block',
      color: '#667eea',
      textDecoration: 'none',
      fontWeight: '700',
      fontSize: '16px',
      padding: '8px 16px',
      background: 'white',
      borderRadius: '8px',
      transition: 'transform 0.2s ease'
    },
    btnPrimary: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '16px 32px',
      fontSize: '16px',
      fontWeight: '700',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
    },
    gameContainer: {
      background: 'rgba(255, 255, 255, 0.98)',
      borderRadius: '24px',
      padding: '40px',
      maxWidth: '500px',
      width: '100%',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
    },
    gameHeader: {
      textAlign: 'center',
      marginBottom: '32px'
    },
    gameTitleWrapper: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      marginBottom: '12px'
    },
    gameTitle: {
      fontSize: '32px',
      fontWeight: '700',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent'
    },
    sparkleIcon: {
      width: '24px',
      height: '24px',
      animation: 'sparkle 1.5s ease-in-out infinite'
    },
    gameSubtitle: {
      fontSize: '16px',
      color: '#666'
    },
    statsBar: {
      display: 'flex',
      justifyContent: 'space-around',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      borderRadius: '16px',
      padding: '16px',
      marginBottom: '24px'
    },
    statItem: {
      textAlign: 'center'
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#667eea'
    },
    statLabel: {
      fontSize: '12px',
      color: '#666',
      marginTop: '4px'
    },
    board: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px',
      marginBottom: '24px',
      aspectRatio: '1'
    },
    cell: {
      aspectRatio: '1',
      border: 'none',
      borderRadius: '16px',
      fontSize: '48px',
      fontWeight: '700',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    },
    cellEmpty: {
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    },
    cellX: {
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: 'white',
      animation: 'pop 0.3s ease'
    },
    cellO: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      animation: 'pop 0.3s ease'
    },
    heartIcon: {
      width: '36px',
      height: '36px'
    },
    gameStatus: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px'
    },
    statusText: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#333',
      flex: 1,
      textAlign: 'center'
    },
    btnReset: {
      background: 'white',
      border: '2px solid #e0e0e0',
      padding: '12px 20px',
      borderRadius: '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: '600',
      color: '#667eea',
      transition: 'all 0.3s ease'
    },
    btnSettings: {
      background: 'white',
      border: '2px solid #e0e0e0',
      padding: '12px',
      borderRadius: '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      transition: 'all 0.3s ease'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease'
    },
    modalContent: {
      background: 'white',
      borderRadius: '24px',
      padding: '40px',
      maxWidth: '400px',
      width: '100%',
      textAlign: 'center',
      animation: 'slideUp 0.3s ease'
    },
    trophyIcon: {
      width: '80px',
      height: '80px',
      color: '#ffd700',
      margin: '0 auto 20px',
      animation: 'bounce 0.5s ease infinite'
    },
    modalTitle: {
      fontSize: '28px',
      fontWeight: '700',
      marginBottom: '12px',
      color: '#333'
    },
    modalText: {
      fontSize: '16px',
      color: '#666',
      marginBottom: '20px'
    },
    promoBox: {
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '16px',
      position: 'relative'
    },
    promoCode: {
      fontSize: '32px',
      fontWeight: '700',
      color: 'white',
      letterSpacing: '4px',
      margin: 0
    },
    copyButton: {
      background: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      color: '#f5576c',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      margin: '12px auto 0',
      transition: 'all 0.3s ease'
    },
    modalNote: {
      fontSize: '14px',
      color: '#999',
      marginBottom: '20px'
    },
    emojiLarge: {
      fontSize: '80px',
      marginBottom: '20px'
    }
  };

  if (showSettings) {
    return (
      <div style={styles.container}>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes sparkle {
            0%, 100% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(-10deg) scale(1.1); }
            75% { transform: rotate(10deg) scale(1.1); }
          }
          @keyframes pop {
            0% { transform: scale(0.8); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          input:focus {
            border-color: #667eea !important;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
          }
          button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
          }
          button:active:not(:disabled) {
            transform: translateY(0);
          }
          a:hover {
            transform: scale(1.05);
          }
        `}</style>
        
        <div style={styles.settingsCard}>
          <div style={styles.settingsHeader}>
            <div style={styles.iconWrapper}>
              <Heart style={styles.settingsIcon} />
            </div>
            <h1 style={styles.settingsTitle}>Добро пожаловать!</h1>
            <p style={styles.settingsSubtitle}>Подключите Telegram за 2 простых шага</p>
          </div>
          
          <div style={styles.settingsBody}>
            <div style={styles.infoBox}>
              <p style={styles.infoText}>
                <strong>Шаг 1:</strong> Откройте нашего бота в Telegram
              </p>
              <a 
                href="https://t.me/ResultTicTacToe_bot" 
                target="_blank" 
                rel="noopener noreferrer"
                style={styles.botLink}
              >
                🤖 @ResultTicTacToe_bot
              </a>
              
              <div style={styles.divider}></div>
              
              <p style={styles.infoText}>
                <strong>Шаг 2:</strong> Отправьте команду <code style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>/start</code>
              </p>
              <p style={{ ...styles.infoText, marginBottom: 0 }}>
                Бот пришлёт вам <strong>6-значный код</strong>. Введите его ниже:
              </p>
            </div>
            
            <div style={styles.inputGroup}>
              <label style={styles.inputLabel}>
                <Info size={16} style={{ marginRight: '6px' }} />
                Ваш код из бота
              </label>
              <input
                type="text"
                value={userCode}
                onChange={(e) => {
                  setUserCode(e.target.value.toUpperCase());
                  setVerificationError('');
                }}
                placeholder="ABC123"
                maxLength={6}
                style={{
                  ...styles.inputField,
                  borderColor: verificationError ? '#f5576c' : '#e0e0e0'
                }}
                disabled={isVerifying}
              />
              {verificationError && (
                <p style={styles.errorText}>{verificationError}</p>
              )}
            </div>
            
            <button
              onClick={startGame}
              disabled={!userCode.trim() || isVerifying}
              style={{
                ...styles.btnPrimary,
                opacity: (userCode.trim() && !isVerifying) ? 1 : 0.5,
                cursor: (userCode.trim() && !isVerifying) ? 'pointer' : 'not-allowed'
              }}
            >
              {isVerifying ? '⏳ Проверка...' : '✨ Начать игру'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.gameContainer}>
        <div style={styles.gameHeader}>
          <div style={styles.gameTitleWrapper}>
            <Sparkles style={{ ...styles.sparkleIcon, color: '#f093fb' }} />
            <h1 style={styles.gameTitle}>Крестики-нолики</h1>
            <Sparkles style={{ ...styles.sparkleIcon, color: '#667eea' }} />
          </div>
          <p style={styles.gameSubtitle}>Сыграйте и выиграйте промокод!</p>
        </div>

        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{stats.wins}</div>
            <div style={styles.statLabel}>Победы</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{stats.draws}</div>
            <div style={styles.statLabel}>Ничьи</div>
          </div>
          <div style={styles.statItem}>
            <div style={styles.statValue}>{stats.losses}</div>
            <div style={styles.statLabel}>Проигрыши</div>
          </div>
        </div>

        <div style={styles.board}>
          {board.map((cell, index) => (
            <button
              key={index}
              onClick={() => handleClick(index)}
              disabled={!isPlayerTurn || gameStatus !== 'playing'}
              style={{
                ...styles.cell,
                ...(cell === 'X' ? styles.cellX : cell === 'O' ? styles.cellO : styles.cellEmpty),
                cursor: (!isPlayerTurn || gameStatus !== 'playing' || cell) ? 'not-allowed' : 'pointer',
                opacity: winningLine && winningLine.includes(index) ? 1 : (gameStatus !== 'playing' && !winningLine?.includes(index) ? 0.5 : 1)
              }}
            >
              {cell === 'X' && <Heart style={styles.heartIcon} />}
              {cell === 'O' && '★'}
            </button>
          ))}
        </div>

        <div style={styles.gameStatus}>
          <button onClick={backToSettings} style={styles.btnSettings}>
            <Settings size={20} color="#667eea" />
          </button>
          
          <p style={styles.statusText}>
            {gameStatus === 'playing' 
              ? (isPlayerTurn ? '💕 Ваш ход' : '⭐ Ход компьютера...')
              : ''}
          </p>
          
          <button onClick={resetGame} style={styles.btnReset}>
            <RefreshCw size={18} />
            Новая игра
          </button>
        </div>
      </div>

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {gameStatus === 'X' ? (
              <div>
                <Trophy style={styles.trophyIcon} />
                <h2 style={styles.modalTitle}>Поздравляем! 🎉</h2>
                <p style={styles.modalText}>Вы победили! Ваш промокод:</p>
                <div style={styles.promoBox}>
                  <p style={styles.promoCode}>{promoCode}</p>
                  <button onClick={copyPromoCode} style={styles.copyButton}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? 'Скопировано!' : 'Копировать'}
                  </button>
                </div>
                <p style={styles.modalNote}>✉️ Промокод отправлен в Telegram</p>
                <button onClick={resetGame} style={styles.btnPrimary}>
                  Сыграть ещё раз
                </button>
              </div>
            ) : gameStatus === 'O' ? (
              <div>
                <div style={styles.emojiLarge}>😔</div>
                <h2 style={styles.modalTitle}>Не расстраивайтесь!</h2>
                <p style={styles.modalText}>В следующий раз обязательно повезёт!</p>
                <button onClick={resetGame} style={styles.btnPrimary}>
                  Попробовать снова
                </button>
              </div>
            ) : (
              <div>
                <div style={styles.emojiLarge}>🤝</div>
                <h2 style={styles.modalTitle}>Ничья!</h2>
                <p style={styles.modalText}>Отличная игра! Попробуем ещё раз?</p>
                <button onClick={resetGame} style={styles.btnPrimary}>
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

// import React, { useState } from 'react';
// import { Sparkles, RefreshCw, Heart, Trophy } from 'lucide-react';
// import './TicTacToe.css';

// const TicTacToe = () => {
//   const [board, setBoard] = useState(Array(9).fill(null));
//   const [isPlayerTurn, setIsPlayerTurn] = useState(true);
//   const [gameStatus, setGameStatus] = useState('playing');
//   const [promoCode, setPromoCode] = useState('');
//   const [showModal, setShowModal] = useState(false);
//   const [chatId, setChatId] = useState('');
//   const [showSettings, setShowSettings] = useState(true);

//   const generatePromoCode = () => {
//     const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
//     let code = '';
//     for (let i = 0; i < 5; i++) {
//       code += chars.charAt(Math.floor(Math.random() * chars.length));
//     }
//     return code;
//   };

//   const sendResultToBackend = async (result, promoCode = '') => {
//     if (!chatId) return;

//     try {
//       const response = await fetch(`${process.env.REACT_APP_API_URL}/api/game/result`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ result, promoCode, chatId })
//       });

//       const data = await response.json();
//       console.log('Backend response:', data);
//     } catch (error) {
//       console.error('Error sending result to backend:', error);
//     }
//   };

//   const checkWinner = (squares) => {
//     const lines = [
//       [0, 1, 2], [3, 4, 5], [6, 7, 8],
//       [0, 3, 6], [1, 4, 7], [2, 5, 8],
//       [0, 4, 8], [2, 4, 6]
//     ];

//     for (let line of lines) {
//       const [a, b, c] = line;
//       if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
//         return { winner: squares[a], line };
//       }
//     }

//     if (squares.every(square => square !== null)) {
//       return { winner: 'draw', line: null };
//     }

//     return { winner: null, line: null };
//   };

//   const minimax = (squares, depth, isMaximizing) => {
//     const result = checkWinner(squares);
    
//     if (result.winner === 'O') return 10 - depth;
//     if (result.winner === 'X') return depth - 10;
//     if (result.winner === 'draw') return 0;

//     if (isMaximizing) {
//       let bestScore = -Infinity;
//       for (let i = 0; i < 9; i++) {
//         if (squares[i] === null) {
//           squares[i] = 'O';
//           let score = minimax(squares, depth + 1, false);
//           squares[i] = null;
//           bestScore = Math.max(score, bestScore);
//         }
//       }
//       return bestScore;
//     } else {
//       let bestScore = Infinity;
//       for (let i = 0; i < 9; i++) {
//         if (squares[i] === null) {
//           squares[i] = 'X';
//           let score = minimax(squares, depth + 1, true);
//           squares[i] = null;
//           bestScore = Math.min(score, bestScore);
//         }
//       }
//       return bestScore;
//     }
//   };

//   const getBestMove = (squares) => {
//     let bestScore = -Infinity;
//     let bestMove = null;

//     for (let i = 0; i < 9; i++) {
//       if (squares[i] === null) {
//         squares[i] = 'O';
//         let score = minimax(squares, 0, false);
//         squares[i] = null;
//         if (score > bestScore) {
//           bestScore = score;
//           bestMove = i;
//         }
//       }
//     }

//     return bestMove;
//   };

//   const handleClick = (index) => {
//     if (board[index] || !isPlayerTurn || gameStatus !== 'playing') return;

//     const newBoard = [...board];
//     newBoard[index] = 'X';
//     setBoard(newBoard);
//     setIsPlayerTurn(false);

//     const result = checkWinner(newBoard);
//     if (result.winner) {
//       handleGameEnd(result.winner, newBoard);
//       return;
//     }

//     setTimeout(() => {
//       const aiMove = getBestMove(newBoard);
//       if (aiMove !== null) {
//         newBoard[aiMove] = 'O';
//         setBoard(newBoard);
        
//         const aiResult = checkWinner(newBoard);
//         if (aiResult.winner) {
//           handleGameEnd(aiResult.winner, newBoard);
//         } else {
//           setIsPlayerTurn(true);
//         }
//       }
//     }, 500);
//   };

//   const handleGameEnd = (winner, finalBoard) => {
//     setGameStatus(winner);

//     if (winner === 'X') {
//       const code = generatePromoCode();
//       setPromoCode(code);
//       sendResultToBackend('win', code);
//     } else if (winner === 'O') {
//       sendResultToBackend('lose');
//     } else {
//       sendResultToBackend('draw');
//     }

//     setShowModal(true);
//   };

//   const resetGame = () => {
//     setBoard(Array(9).fill(null));
//     setIsPlayerTurn(true);
//     setGameStatus('playing');
//     setPromoCode('');
//     setShowModal(false);
//   };

//   const startGame = () => {
//     if (chatId) {
//       setShowSettings(false);
//     }
//   };

//   if (showSettings) {
//     return (
//       <div className="container">
//         <div className="settings-card">
//           <div className="settings-header">
//             <Heart className="settings-icon" />
//             <h1 className="settings-title">Настройка Telegram</h1>
//             <p className="settings-subtitle">Введите ваш Chat ID</p>
//           </div>
          
//           <div>
//             <div className="input-group">
//               <label className="input-label">Chat ID</label>
//               <input
//                 type="text"
//                 value={chatId}
//                 onChange={(e) => setChatId(e.target.value)}
//                 placeholder="123456789"
//                 className="input-field"
//               />
//             </div>
            
//             <div className="info-box">
//               <p className="info-title">
//                 Присоединитесь к нашему боту: 
//                 <strong>
//                   <a 
//                     href="https://t.me/ResultTicTacToe_bot" 
//                     target="_blank" 
//                     rel="noopener noreferrer"
//                     className="bot-link"
//                   >
//                     @ResultTicTacToe_bot
//                   </a>
//                 </strong>
//               </p>
//               <p className="info-title">Как получить Chat ID:</p>
//               <ol className="info-list">
//                 <li>Найдите свой Chat ID через @userinfobot</li>
//               </ol>
//             </div>
            
//             <button
//               onClick={startGame}
//               disabled={!chatId}
//               className="btn-primary"
//             >
//               Начать игру
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="container">
//       <div className="game-container">
//         <div className="game-header">
//           <div className="game-title-wrapper">
//             <Sparkles className="sparkle-icon sparkle-purple" />
//             <h1 className="game-title">Крестики-нолики</h1>
//             <Sparkles className="sparkle-icon sparkle-pink" />
//           </div>
//           <p className="game-subtitle">Сыграйте и выиграйте промокод!</p>
//         </div>

//         <div className="game-card">
//           <div className="board">
//             {board.map((cell, index) => (
//               <button
//                 key={index}
//                 onClick={() => handleClick(index)}
//                 disabled={!isPlayerTurn || gameStatus !== 'playing'}
//                 className={`cell ${
//                   cell === 'X' ? 'cell-x' : cell === 'O' ? 'cell-o' : 'cell-empty'
//                 }`}
//               >
//                 {cell === 'X' && <Heart className="heart-icon" />}
//                 {cell === 'O' && '★'}
//               </button>
//             ))}
//           </div>

//           <div className="game-status">
//             <p className="status-text">
//               {gameStatus === 'playing' 
//                 ? (isPlayerTurn ? '💕 Ваш ход' : '⭐ Ход компьютера...')
//                 : ''}
//             </p>
            
//             <button onClick={resetGame} className="btn-reset">
//               <RefreshCw className="refresh-icon" />
//               Новая игра
//             </button>
//           </div>
//         </div>
//       </div>

//       {showModal && (
//         <div className="modal-overlay">
//           <div className="modal-content">
//             {gameStatus === 'X' ? (
//               <div>
//                 <Trophy className="trophy-icon" />
//                 <h2 className="modal-title">Поздравляем! 🎉</h2>
//                 <p className="modal-text">Вы победили! Ваш промокод:</p>
//                 <div className="promo-box">
//                   <p className="promo-code">{promoCode}</p>
//                 </div>
//                 <p className="modal-note">Промокод отправлен в Telegram</p>
//                 <button onClick={resetGame} className="btn-primary">
//                   Сыграть ещё раз
//                 </button>
//               </div>
//             ) : gameStatus === 'O' ? (
//               <div>
//                 <div className="emoji-large">😔</div>
//                 <h2 className="modal-title">Не расстраивайтесь!</h2>
//                 <p className="modal-text">В следующий раз обязательно повезёт!</p>
//                 <button onClick={resetGame} className="btn-primary">
//                   Попробовать снова
//                 </button>
//               </div>
//             ) : (
//               <div>
//                 <div className="emoji-large">🤝</div>
//                 <h2 className="modal-title">Ничья!</h2>
//                 <p className="modal-text">Отличная игра! Попробуем ещё раз?</p>
//                 <button onClick={resetGame} className="btn-primary">
//                   Сыграть ещё раз
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default TicTacToe;