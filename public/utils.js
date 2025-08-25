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
        'loading_results': 'Loading results...',
        
        // Teacher interface
        'select_quiz_create_room': 'Select a quiz to create a new room. Each question set becomes a room that students can join.',
        'create_new_quiz': 'Create New Quiz',
        'refresh_quiz_list': 'Refresh Quiz List',
        'quiz_history': 'Quiz History',
        'room_created_successfully': 'Room created successfully!',
        'room_information': 'Room Information',
        'share_link_students': 'Share this link with your students:',
        'copy': 'Copy',
        'scan_qr_mobile': 'Scan QR code to join on mobile',
        'students_join_room_id': 'Students can also join by entering room ID:',
        'players': 'Players',
        'no_players_joined': 'No players have joined yet',
        'start_quiz': 'Start Quiz',
        'are_you_sure_delete_room': 'Are you sure you want to delete this room? All students will be disconnected.',
        'going_back_delete_room': 'Going back will delete the room and disconnect all students. Are you sure?',
        'teacher_view_students_answering': 'You are in teacher view. Students are answering this question.',
        'player_results': 'Player Results',
        'player': 'Player',
        'answer': 'Answer',
        'result': 'Result',
        'score': 'Score',
        'next_question': 'Next Question',
        'finalize_quiz': 'Finalize Quiz',
        'quiz_ended_successfully': 'Quiz has ended successfully! Results have been saved to history.',
        'final_rankings': 'Final Rankings',
        'rank': 'Rank',
        'start_new_quiz': 'Start New Quiz',
        'download_csv': 'Download CSV',
        'click_quiz_view_results': 'Click on a quiz session to view detailed results.',
        'no_quiz_history': 'No quiz history available',
        'quiz_session': 'Quiz Session',
        'action': 'Action',
        'view_results': 'View Results',
        'refresh_history': 'Refresh History',
        'player_rankings': 'Player Rankings',
        'quiz_json_format': 'Quiz in JSON Format:',
        'paste_quiz_json': 'Paste your quiz JSON here.',
        'need_help_creating_quiz': 'Need help creating a quiz?',
        'click_here': 'Click here',
        'save_quiz': 'Save Quiz',
        'download_template': 'Download Template',
        
        // Modal translations
        'how_to_create_quiz': 'How to Create Your Quiz',
        'copy_chatgpt_prompt': 'Copy this prompt to ChatGPT along with your teaching materials. Make sure to change the [YOUR TOPIC/MATERIALS] placeholder to match your content.',
        'copy': 'Copy',
        
        // Table headers and dynamic content
        'quiz_details': 'Quiz Details',
        'questions': 'Questions',
        'no_description_available': 'No description available',
        'create_room': 'Create Room',
        'no_quizzes_available': 'No quizzes available',
        'question': 'Question',
        'of': 'of'
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
        'loading_results': 'Memuat hasil...',
        
        // Teacher interface
        'select_quiz_create_room': 'Pilih kuis untuk membuat ruangan baru. Setiap set pertanyaan menjadi ruangan yang dapat dimasuki siswa.',
        'create_new_quiz': 'Buat Kuis Baru',
        'refresh_quiz_list': 'Segarkan Daftar Kuis',
        'quiz_history': 'Riwayat Kuis',
        'room_created_successfully': 'Ruangan berhasil dibuat!',
        'room_information': 'Informasi Ruangan',
        'share_link_students': 'Bagikan tautan ini kepada siswa Anda:',
        'copy': 'Salin',
        'scan_qr_mobile': 'Pindai kode QR untuk bergabung di ponsel',
        'students_join_room_id': 'Siswa juga dapat bergabung dengan memasukkan ID ruangan:',
        'players': 'Pemain',
        'no_players_joined': 'Belum ada pemain yang bergabung',
        'start_quiz': 'Mulai Kuis',
        'are_you_sure_delete_room': 'Apakah Anda yakin ingin menghapus ruangan ini? Semua siswa akan terputus.',
        'going_back_delete_room': 'Kembali akan menghapus ruangan dan memutuskan semua siswa. Apakah Anda yakin?',
        'teacher_view_students_answering': 'Anda dalam tampilan guru. Siswa sedang menjawab pertanyaan ini.',
        'player_results': 'Hasil Pemain',
        'player': 'Pemain',
        'answer': 'Jawaban',
        'result': 'Hasil',
        'score': 'Skor',
        'next_question': 'Pertanyaan Selanjutnya',
        'finalize_quiz': 'Selesaikan Kuis',
        'quiz_ended_successfully': 'Kuis berhasil berakhir! Hasil telah disimpan ke riwayat.',
        'final_rankings': 'Peringkat Akhir',
        'rank': 'Peringkat',
        'start_new_quiz': 'Mulai Kuis Baru',
        'download_csv': 'Unduh CSV',
        'click_quiz_view_results': 'Klik pada sesi kuis untuk melihat hasil terperinci.',
        'no_quiz_history': 'Tidak ada riwayat kuis tersedia',
        'quiz_session': 'Sesi Kuis',
        'action': 'Aksi',
        'view_results': 'Lihat Hasil',
        'refresh_history': 'Segarkan Riwayat',
        'player_rankings': 'Peringkat Pemain',
        'quiz_json_format': 'Kuis dalam Format JSON:',
        'paste_quiz_json': 'Tempel JSON kuis Anda di sini.',
        'need_help_creating_quiz': 'Perlu bantuan membuat kuis?',
        'click_here': 'Klik di sini',
        'save_quiz': 'Simpan Kuis',
        'download_template': 'Unduh Template',
        
        // Modal translations
        'how_to_create_quiz': 'Cara Membuat Kuis Anda',
        'copy_chatgpt_prompt': 'Salin prompt ini ke ChatGPT beserta materi pengajaran Anda. Pastikan untuk mengubah placeholder [TOPIK/MATERI ANDA] agar sesuai dengan konten Anda.',
        'copy': 'Salin',
        
        // Table headers and dynamic content
        'quiz_details': 'Detail Kuis',
        'questions': 'Pertanyaan',
        'no_description_available': 'Tidak ada deskripsi tersedia',
        'create_room': 'Buat Ruangan',
        'no_quizzes_available': 'Tidak ada kuis tersedia',
        'question': 'Pertanyaan',
        'of': 'dari'
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
      } else if (element.tagName === 'TEXTAREA' && element.hasAttribute('placeholder')) {
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
