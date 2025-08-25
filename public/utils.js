// Utility functions for the quiz application

/**
 * Updates the header title based on the current screen
 * @param {string} screenName - The name of the current screen
 */
function updateHeaderTitle(screenName) {
  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle) {
    headerTitle.textContent = screenName;
  }
}

// Language utility functions
window.LanguageUtils = {
  getCurrentLanguage: function() {
    return localStorage.getItem('appLanguage') || 'en';
  },
  
  setLanguage: function(lang) {
    localStorage.setItem('appLanguage', lang);
    // Sync with server
    this.syncLanguageWithServer(lang);
  },
  
  // Sync language preference with server
  syncLanguageWithServer: function(lang) {
    fetch('/api/set-language', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ language: lang })
    }).catch(error => {
      console.warn('Failed to sync language with server:', error);
    });
  },
  
  // Get language from server on page load
  initLanguageFromServer: function() {
    return fetch('/api/get-language')
      .then(response => response.json())
      .then(data => {
        if (data.language) {
          localStorage.setItem('appLanguage', data.language);
          return data.language;
        }
        return this.getCurrentLanguage();
      })
      .catch(error => {
        console.warn('Failed to get language from server:', error);
        return this.getCurrentLanguage();
      });
  },
  
  t: function(key, lang = null) {
    const currentLang = lang || this.getCurrentLanguage();
    const translations = {
      en: {
        // Common translations
        'loading': 'Loading...',
        'error': 'Error',
        'success': 'Success',
        
        // Navigation
        'dashboard': 'Dashboard',
        'quiz_selection': 'Quiz Selection',
        'waiting_room': 'Waiting Room',
        'quiz_in_progress': 'Quiz in Progress',
        'question_results': 'Question Results',
        'quiz_result': 'Quiz Result',
        'quiz_history': 'Quiz History',
        'quiz_history_detail': 'Quiz History Detail',
        'create_room': 'Create Room',
        'create_new_quiz': 'Create New Quiz',
        
        // Student interface
        'your_name': 'Your Name',
        'student_id': 'Student ID',
        'room_id': 'Room ID',
        'join_quiz': 'Join Quiz',
        'enter_your_name': 'Enter your name',
        'enter_student_id': 'Enter your student ID',
        'enter_room_id': 'Enter room ID',
        'successfully_joined': 'You\'ve successfully joined the room!',
        'room': 'Room',
        'wait_teacher': 'Wait for the teacher to start the quiz',
        'waiting_quiz_begin': 'Waiting for the quiz to begin...',
        'players_in_room': 'Players in this room:',
        'back': 'BACK',
        'your_score': 'Your Score:',
        'waiting_next_question': 'Waiting for the next question...',
        'thank_you_participating': 'Thank You for Participating!',
        'quiz_ended_final_score': 'The quiz has ended. Your final score:',
        'teacher_share_results': 'Your teacher will share the results soon.',
        'join_another_quiz': 'Join Another Quiz',
        'waiting_other_players': 'Waiting for other players or time to end...',
        'your_answer_correct': 'Your answer was correct!',
        'your_answer_incorrect': 'Your answer was incorrect!',
        'no_answer_in_time': 'You did not answer in time!',
        'your_score_colon': 'Your Score:',
        'loading_results': 'Loading results...'
      },
      id: {
        // Common translations
        'loading': 'Memuat...',
        'error': 'Kesalahan',
        'success': 'Berhasil',
        
        // Navigation
        'dashboard': 'Dasbor',
        'quiz_selection': 'Pilihan Kuis',
        'waiting_room': 'Ruang Tunggu',
        'quiz_in_progress': 'Kuis Berlangsung',
        'question_results': 'Hasil Pertanyaan',
        'quiz_result': 'Hasil Kuis',
        'quiz_history': 'Riwayat Kuis',
        'quiz_history_detail': 'Detail Riwayat Kuis',
        'create_room': 'Buat Ruangan',
        'create_new_quiz': 'Buat Kuis Baru',
        
        // Student interface
        'your_name': 'Nama Anda',
        'student_id': 'ID Siswa',
        'room_id': 'ID Ruangan',
        'join_quiz': 'Gabung Kuis',
        'enter_your_name': 'Masukkan nama Anda',
        'enter_student_id': 'Masukkan ID siswa Anda',
        'enter_room_id': 'Masukkan ID ruangan',
        'successfully_joined': 'Anda berhasil bergabung ke ruangan!',
        'room': 'Ruangan',
        'wait_teacher': 'Tunggu guru memulai kuis',
        'waiting_quiz_begin': 'Menunggu kuis dimulai...',
        'players_in_room': 'Pemain di ruangan ini:',
        'back': 'KEMBALI',
        'your_score': 'Skor Anda:',
        'waiting_next_question': 'Menunggu pertanyaan selanjutnya...',
        'thank_you_participating': 'Terima Kasih Telah Berpartisipasi!',
        'quiz_ended_final_score': 'Kuis telah berakhir. Skor akhir Anda:',  // Result screen translations
        'teacher_share_results': 'Guru Anda akan membagikan hasilnya segera.',
        'your_answer_correct': 'Jawaban Anda benar!',
        'join_another_quiz': 'Gabung Kuis Lain',
        'waiting_other_players': 'Menunggu pemain lain atau waktu berakhir...',
        'your_answer_incorrect': 'Jawaban Anda salah!',
        'no_answer_in_time': 'Anda tidak menjawab tepat waktu!',
        'your_score_colon': 'Skor Anda:',
        'loading_results': 'Memuat hasil...'
      }
    };

    return translations[currentLang] && translations[currentLang][key] ? translations[currentLang][key] : key;
  },

  // Apply translations to current page
  applyTranslations: function(lang = null) {
    const currentLang = lang || this.getCurrentLanguage();
    
    // Update elements with data-lang attributes
    document.querySelectorAll('[data-lang-key]').forEach(element => {
      const key = element.getAttribute('data-lang-key');
      const translation = this.t(key, currentLang);
      
      if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    });
  }
};

// Export utility functions if using modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    updateHeaderTitle
  };
}
