/* ============================================================
   AURAE — Client-side JavaScript
   Scroll animations, parallax, header effects, favorites, forms
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ============================================================
  // 1. Scroll-triggered Animations (Intersection Observer)
  // ============================================================
  const animateObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        animateObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.05,
    rootMargin: '0px 0px -60px 0px'
  });

  document.querySelectorAll('[data-animate], [data-animate-stagger]').forEach(el => {
    animateObserver.observe(el);
  });

  // Safety fallback: reveal everything after 2s
  setTimeout(() => {
    document.querySelectorAll('[data-animate], [data-animate-stagger]').forEach(el => {
      if (!el.classList.contains('is-visible')) {
        el.classList.add('is-visible');
      }
    });
  }, 2000);

  // ============================================================
  // 2. Header Scroll Effect (smooth with rAF)
  // ============================================================
  const header = document.getElementById('siteHeader');
  if (header) {
    // Pages without a hero need dark header text immediately
    const hasHero = document.querySelector('.hero, .recipe-hero');
    if (!hasHero) {
      header.classList.add('header-scrolled');
    }

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!hasHero || window.scrollY > 80) {
            header.classList.add('header-scrolled');
          } else {
            header.classList.remove('header-scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // ============================================================
  // 3. Hero Parallax Effect
  // ============================================================
  const heroBackground = document.querySelector('.hero__background img');
  const recipeHeroImg = document.querySelector('.recipe-hero > img');

  if (heroBackground || recipeHeroImg) {
    let parallaxTicking = false;
    window.addEventListener('scroll', () => {
      if (!parallaxTicking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          if (heroBackground && scrollY < window.innerHeight) {
            heroBackground.style.transform = 'translateY(' + (scrollY * 0.3) + 'px) scale(1.1)';
          }
          if (recipeHeroImg && scrollY < window.innerHeight) {
            recipeHeroImg.style.transform = 'translateY(' + (scrollY * 0.25) + 'px) scale(1.05)';
          }
          parallaxTicking = false;
        });
        parallaxTicking = true;
      }
    }, { passive: true });
  }

  // ============================================================
  // 4. Reading Progress Bar (recipe detail pages)
  // ============================================================
  const progressBar = document.getElementById('readingProgress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = progress + '%';
    }, { passive: true });
  }

  // ============================================================
  // 5. Image Lazy Load with Fade-in
  // ============================================================
  document.querySelectorAll('img[loading="lazy"]').forEach(img => {
    if (img.complete) {
      img.classList.add('img-loaded');
    } else {
      img.addEventListener('load', () => {
        img.classList.add('img-loaded');
      }, { once: true });
    }
  });

  // ============================================================
  // 6. Mobile Menu Toggle
  // ============================================================
  const menuToggle = document.getElementById('mobileMenuToggle');
  const mainNav = document.getElementById('mainNav');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('is-open');
      mainNav.classList.toggle('is-open');
    });

    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('is-open');
        mainNav.classList.remove('is-open');
      });
    });

    document.addEventListener('click', (e) => {
      if (!mainNav.contains(e.target) && !menuToggle.contains(e.target)) {
        menuToggle.classList.remove('is-open');
        mainNav.classList.remove('is-open');
      }
    });
  }

  // ============================================================
  // 7. Favorite Toggle (with animation)
  // ============================================================
  const favoriteBtn = document.querySelector('.favorite-btn[data-recipe-id]');
  if (favoriteBtn) {
    favoriteBtn.addEventListener('click', async () => {
      const recipeId = favoriteBtn.dataset.recipeId;
      favoriteBtn.classList.add('fav-animating');

      try {
        const res = await fetch('/favorites/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipeId: parseInt(recipeId) })
        });
        const data = await res.json();

        if (data.favorited) {
          favoriteBtn.classList.add('is-favorited');
          favoriteBtn.querySelector('span').textContent = 'Saved';
        } else {
          favoriteBtn.classList.remove('is-favorited');
          favoriteBtn.querySelector('span').textContent = 'Save Recipe';
        }
      } catch (err) {
        console.error('Failed to toggle favorite:', err);
      }

      setTimeout(() => favoriteBtn.classList.remove('fav-animating'), 400);
    });
  }

  // ============================================================
  // 8. Smooth Scroll for Anchor Links
  // ============================================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ============================================================
  // 9. Dynamic Form Fields (Create Recipe)
  // ============================================================
  const ingredientsList = document.getElementById('ingredientsList');
  const addIngredientBtn = document.getElementById('addIngredient');
  const instructionsList = document.getElementById('instructionsList');
  const addInstructionBtn = document.getElementById('addInstruction');

  if (addIngredientBtn && ingredientsList) {
    addIngredientBtn.addEventListener('click', () => {
      const item = document.createElement('div');
      item.className = 'dynamic-list__item';
      item.innerHTML = '<input type="text" name="ingredients[]" placeholder="e.g. 1 cup sugar"><button type="button" class="dynamic-list__remove" title="Remove">&times;</button>';
      ingredientsList.appendChild(item);
      item.querySelector('input').focus();
    });
  }

  if (addInstructionBtn && instructionsList) {
    addInstructionBtn.addEventListener('click', () => {
      const stepCount = instructionsList.querySelectorAll('.dynamic-list__item').length + 1;
      const item = document.createElement('div');
      item.className = 'dynamic-list__item';
      item.innerHTML = '<span class="dynamic-list__step-num">' + String(stepCount).padStart(2, '0') + '</span><textarea name="instructions[]" placeholder="Describe this step..." rows="2"></textarea><button type="button" class="dynamic-list__remove" title="Remove">&times;</button>';
      instructionsList.appendChild(item);
      item.querySelector('textarea').focus();
    });
  }

  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('dynamic-list__remove')) {
      const list = e.target.closest('.dynamic-list');
      const items = list.querySelectorAll('.dynamic-list__item');
      if (items.length > 1) {
        e.target.closest('.dynamic-list__item').remove();
        if (list.id === 'instructionsList') renumberSteps();
      }
    }
  });

  function renumberSteps() {
    if (!instructionsList) return;
    instructionsList.querySelectorAll('.dynamic-list__item').forEach((item, idx) => {
      const numEl = item.querySelector('.dynamic-list__step-num');
      if (numEl) numEl.textContent = String(idx + 1).padStart(2, '0');
    });
  }

  // ============================================================
  // 10. Image URL Preview
  // ============================================================
  const imageUrlInput = document.getElementById('imageUrl');
  const imagePreviewImg = document.getElementById('imagePreviewImg');

  if (imageUrlInput && imagePreviewImg) {
    const updatePreview = () => {
      const url = imageUrlInput.value.trim();
      if (url) {
        imagePreviewImg.src = url;
        imagePreviewImg.onload = () => imagePreviewImg.classList.add('loaded');
        imagePreviewImg.onerror = () => imagePreviewImg.classList.remove('loaded');
      } else {
        imagePreviewImg.classList.remove('loaded');
        imagePreviewImg.src = '';
      }
    };
    imageUrlInput.addEventListener('blur', updatePreview);
    imageUrlInput.addEventListener('input', debounce(updatePreview, 500));
    if (imageUrlInput.value) updatePreview();
  }

  // ============================================================
  // 11. AI Auto-fill (Create Recipe Page)
  // ============================================================
  const aiAutofillBtn = document.getElementById('aiAutofillBtn');
  const aiLoading = document.getElementById('aiLoading');

  if (aiAutofillBtn) {
    aiAutofillBtn.addEventListener('click', async () => {
      const titleInput = document.getElementById('title');
      const title = titleInput ? titleInput.value.trim() : '';

      if (!title) {
        titleInput.focus();
        titleInput.style.outline = '2px solid #c67d5b';
        setTimeout(() => titleInput.style.outline = '', 2000);
        return;
      }

      // Get selected category name
      const categorySelect = document.getElementById('category');
      let categoryName = 'dinner';
      if (categorySelect && categorySelect.selectedIndex > 0) {
        categoryName = categorySelect.options[categorySelect.selectedIndex].text.toLowerCase();
      } else if (categorySelect) {
        // Auto-select first real category so publish doesn't fail
        for (let i = 1; i < categorySelect.options.length; i++) {
          if (categorySelect.options[i].value) {
            categorySelect.selectedIndex = i;
            categoryName = categorySelect.options[i].text.toLowerCase();
            break;
          }
        }
      }

      // Show loading, disable button
      aiAutofillBtn.disabled = true;
      aiAutofillBtn.querySelector('span').textContent = 'Generating...';
      if (aiLoading) aiLoading.style.display = 'flex';

      try {
        const res = await fetch('/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title, category: categoryName })
        });

        if (!res.ok) throw new Error('AI request failed');
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        // Fill description
        const descEl = document.getElementById('description');
        if (descEl && data.description) descEl.value = data.description;

        // Fill prep time, cook time, servings
        const prepEl = document.getElementById('prepTime');
        const cookEl = document.getElementById('cookTime');
        const servingsEl = document.getElementById('servings');
        if (prepEl && data.prep_time) prepEl.value = data.prep_time;
        if (cookEl && data.cook_time) cookEl.value = data.cook_time;
        if (servingsEl && data.servings) servingsEl.value = data.servings;

        // Fill difficulty
        if (data.difficulty) {
          const diffMap = { 'Easy': 'diffEasy', 'Medium': 'diffMedium', 'Advanced': 'diffAdvanced' };
          const radioId = diffMap[data.difficulty];
          if (radioId) {
            const radio = document.getElementById(radioId);
            if (radio) radio.checked = true;
          }
        }

        // Fill ingredients
        const ingredientsList = document.getElementById('ingredientsList');
        if (ingredientsList && data.ingredients && data.ingredients.length > 0) {
          ingredientsList.innerHTML = '';
          data.ingredients.forEach(function(ing) {
            const item = document.createElement('div');
            item.className = 'dynamic-list__item';
            item.innerHTML = '<input type="text" name="ingredients[]" value="' + ing.replace(/"/g, '&quot;') + '" required>' +
              '<button type="button" class="dynamic-list__remove" title="Remove">&times;</button>';
            ingredientsList.appendChild(item);
          });
        }

        // Fill instructions
        const instructionsList = document.getElementById('instructionsList');
        if (instructionsList && data.instructions && data.instructions.length > 0) {
          instructionsList.innerHTML = '';
          data.instructions.forEach(function(step, idx) {
            const text = step.text || step;
            const item = document.createElement('div');
            item.className = 'dynamic-list__item';
            item.innerHTML = '<span class="dynamic-list__step-num">' + String(idx + 1).padStart(2, '0') + '</span>' +
              '<textarea name="instructions[]" rows="2" required>' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</textarea>' +
              '<button type="button" class="dynamic-list__remove" title="Remove">&times;</button>';
            instructionsList.appendChild(item);
          });
        }

        // Visual confirmation
        aiAutofillBtn.querySelector('span').textContent = 'Generating image...';

        // Now generate the image
        try {
          const imgRes = await fetch('/ai/generate-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title })
          });

          if (imgRes.ok) {
            const imgData = await imgRes.json();
            if (imgData.imageUrl) {
              const imageUrlInput = document.getElementById('imageUrl');
              const imagePreviewImg = document.getElementById('imagePreviewImg');
              if (imageUrlInput) imageUrlInput.value = imgData.imageUrl;
              if (imagePreviewImg) {
                imagePreviewImg.src = imgData.imageUrl;
                imagePreviewImg.onload = function() {
                  imagePreviewImg.classList.add('loaded');
                };
              }
            }
          }
        } catch (imgErr) {
          console.log('Image generation skipped:', imgErr.message);
        }

        aiAutofillBtn.querySelector('span').textContent = 'Filled!';
        aiAutofillBtn.classList.add('btn--ai-success');
        setTimeout(() => {
          aiAutofillBtn.querySelector('span').textContent = 'Auto-fill with AI';
          aiAutofillBtn.classList.remove('btn--ai-success');
        }, 2500);

      } catch (err) {
        console.error('AI auto-fill error:', err);
        aiAutofillBtn.querySelector('span').textContent = 'Failed — try again';
        setTimeout(() => {
          aiAutofillBtn.querySelector('span').textContent = 'Auto-fill with AI';
        }, 2500);
      } finally {
        aiAutofillBtn.disabled = false;
        if (aiLoading) aiLoading.style.display = 'none';
      }
    });
  }

  // ============================================================
  // Utility: Debounce
  // ============================================================
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ============================================================
  // 12. MASTER CHEF CHATBOT
  // ============================================================
  const chefPanel = document.getElementById('chefChatPanel');
  const chefBackdrop = document.getElementById('chefChatBackdrop');
  const chefFab = document.getElementById('chefChatFab');
  const chefClose = document.getElementById('chefChatClose');
  const chefReset = document.getElementById('chefChatReset');
  const chefMessages = document.getElementById('chefChatMessages');
  const chefTyping = document.getElementById('chefChatTyping');
  const chefSuggestions = document.getElementById('chefChatSuggestions');
  const chefInput = document.getElementById('chefChatInput');
  const chefSend = document.getElementById('chefChatSend');
  const chefNavLink = document.getElementById('masterChefNavLink');

  if (chefPanel && chefFab) {
    let chefOpen = false;

    // Restore messages from sessionStorage
    const savedChat = sessionStorage.getItem('chefChatMessages');
    if (savedChat) {
      chefMessages.innerHTML = savedChat;
      if (chefSuggestions) chefSuggestions.style.display = 'none';
    }

    function openChefChat() {
      chefOpen = true;
      chefPanel.classList.add('is-open');
      chefBackdrop.classList.add('is-visible');
      chefFab.classList.add('is-open');
      document.body.classList.add('chef-chat-open');
      chefMessages.scrollTop = chefMessages.scrollHeight;
      setTimeout(function() { chefInput.focus(); }, 400);
    }

    function closeChefChat() {
      chefOpen = false;
      chefPanel.classList.remove('is-open');
      chefBackdrop.classList.remove('is-visible');
      chefFab.classList.remove('is-open');
      document.body.classList.remove('chef-chat-open');
    }

    chefFab.addEventListener('click', function() { chefOpen ? closeChefChat() : openChefChat(); });
    chefClose.addEventListener('click', closeChefChat);
    chefBackdrop.addEventListener('click', closeChefChat);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && chefOpen) closeChefChat();
    });

    if (chefNavLink) {
      chefNavLink.addEventListener('click', function(e) {
        e.preventDefault();
        openChefChat();
      });
    }

    // Markdown renderer
    function renderChefMarkdown(text) {
      var html = text.replace(/\[GENERATE_IMAGE:.+?\]\n?/g, '');
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
      html = html.replace(/\[(.+?)\]\((.+?)\)/g, function(m, label, url) {
        var isYT = url.includes('youtube.com');
        if (isYT) {
          return '<a href="' + url + '" target="_blank" rel="noopener" class="chef-chat__link chef-chat__link--yt">' +
            '<svg class="chef-chat__yt-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>' +
            label + '</a>';
        }
        return '<a href="' + url + '" target="_blank" rel="noopener" class="chef-chat__link">' + label + '</a>';
      });
      html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>');
      html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
      html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');
      html = html.split(/\n{2,}/).map(function(block) {
        block = block.trim();
        if (!block || block.startsWith('<ul>') || block.startsWith('<ol>')) return block;
        return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
      }).join('');
      return html;
    }

    var botAvatarSVG = '<svg viewBox="0 0 32 32" width="32" height="32" fill="none"><circle cx="16" cy="16" r="16" fill="#C67D5B"/><ellipse cx="16" cy="11" rx="7" ry="5.5" stroke="white" stroke-width="1.2" fill="rgba(255,255,255,0.1)"/><circle cx="12" cy="10" r="2.8" stroke="white" stroke-width="1.2" fill="rgba(255,255,255,0.08)"/><circle cx="20" cy="10" r="2.8" stroke="white" stroke-width="1.2" fill="rgba(255,255,255,0.08)"/><circle cx="16" cy="7.5" r="2.8" stroke="white" stroke-width="1.2" fill="rgba(255,255,255,0.08)"/><rect x="9.5" y="15" width="13" height="4" rx="1.5" stroke="white" stroke-width="1.2" fill="rgba(255,255,255,0.1)"/><path d="M11 19v3.5a2.5 2.5 0 0 0 2.5 2.5h5a2.5 2.5 0 0 0 2.5-2.5V19" stroke="white" stroke-width="1.2" fill="rgba(255,255,255,0.05)"/></svg>';

    function addChefMessage(text, isUser) {
      var msg = document.createElement('div');
      msg.className = 'chef-chat__message chef-chat__message--' + (isUser ? 'user' : 'bot');
      var inner = '';
      if (!isUser) inner += '<div class="chef-chat__msg-avatar">' + botAvatarSVG + '</div>';
      inner += '<div class="chef-chat__msg-body">';
      if (isUser) {
        inner += '<p>' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</p>';
      } else {
        inner += renderChefMarkdown(text);
      }
      inner += '</div>';
      msg.innerHTML = inner;
      chefMessages.appendChild(msg);
      scrollChefToBottom();
      saveChefChat();
      return msg;
    }

    function scrollChefToBottom() { chefMessages.scrollTop = chefMessages.scrollHeight; }
    function saveChefChat() { sessionStorage.setItem('chefChatMessages', chefMessages.innerHTML); }
    function showChefTyping() { chefTyping.classList.add('is-visible'); scrollChefToBottom(); }
    function hideChefTyping() { chefTyping.classList.remove('is-visible'); }

    var chefSending = false;

    async function sendChefMessage(text) {
      if (!text.trim() || chefSending) return;
      chefSending = true;
      chefSend.disabled = true;
      if (chefSuggestions) chefSuggestions.style.display = 'none';
      addChefMessage(text, true);
      chefInput.value = '';
      chefInput.style.height = 'auto';
      showChefTyping();

      try {
        var res = await fetch('/chef/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        hideChefTyping();

        if (!res.ok) {
          var errData = await res.json().catch(function() { return {}; });
          addChefMessage(errData.error || 'Something went wrong. Please try again.', false);
          return;
        }

        var data = await res.json();
        var msgEl = addChefMessage(data.reply, false);

        if (data.imageUrl) {
          var body = msgEl.querySelector('.chef-chat__msg-body');
          var img = document.createElement('img');
          img.className = 'chef-chat__image';
          img.src = data.imageUrl;
          img.alt = 'Generated dish';
          body.appendChild(img);
          img.onload = function() { scrollChefToBottom(); saveChefChat(); };
        }
      } catch (err) {
        hideChefTyping();
        addChefMessage('The Master Chef is unavailable right now. Please try again.', false);
      } finally {
        chefSending = false;
        chefSend.disabled = !chefInput.value.trim();
      }
    }

    // Input handling
    chefInput.addEventListener('input', function() {
      chefSend.disabled = !this.value.trim();
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    chefInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (this.value.trim()) sendChefMessage(this.value.trim());
      }
    });

    chefSend.addEventListener('click', function() {
      if (chefInput.value.trim()) sendChefMessage(chefInput.value.trim());
    });

    // Suggestion chips
    if (chefSuggestions) {
      chefSuggestions.addEventListener('click', function(e) {
        if (e.target.classList.contains('chef-chat__chip')) {
          sendChefMessage(e.target.textContent);
        }
      });
    }

    // Reset conversation
    if (chefReset) {
      chefReset.addEventListener('click', async function() {
        try { await fetch('/chef/reset', { method: 'POST' }); } catch (e) {}
        chefMessages.innerHTML = '';
        var welcome = document.createElement('div');
        welcome.className = 'chef-chat__message chef-chat__message--bot';
        welcome.innerHTML = '<div class="chef-chat__msg-avatar">' + botAvatarSVG + '</div>' +
          '<div class="chef-chat__msg-body"><p>Fresh start! What shall we cook today?</p></div>';
        chefMessages.appendChild(welcome);
        if (chefSuggestions) chefSuggestions.style.display = 'flex';
        sessionStorage.removeItem('chefChatMessages');
      });
    }
  }

});
