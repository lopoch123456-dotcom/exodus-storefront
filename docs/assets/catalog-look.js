/* Load an alternate view only when requested, while the product link stays native. */
document.querySelectorAll('[data-catalog-look]').forEach(card => {
  const toggle = card.querySelector('[data-catalog-look-toggle]');
  const picture = card.querySelector('.sample-picture');
  const cover = picture.querySelector('img');
  const template = card.querySelector('[data-catalog-look-template]');
  const status = card.querySelector('[data-catalog-look-status]');
  let hovered = false;
  let pinned = false;
  let pending = false;
  let look;

  function update() {
    const visible = Boolean(look && (hovered || pinned));
    card.toggleAttribute('data-look-visible', visible);
    toggle.setAttribute('aria-pressed', String(pinned));
    cover.setAttribute('aria-hidden', String(visible));
    if (look) {
      look.setAttribute('aria-hidden', String(!visible));
      look.nextElementSibling.setAttribute('aria-hidden', String(!visible));
    } else if ((hovered || pinned) && !pending) {
      load();
    }
  }

  async function load() {
    pending = true;
    if (pinned) status.textContent = status.dataset.loading;
    const content = template.content.cloneNode(true);
    const image = content.querySelector('img');
    const kind = content.querySelector('.catalog-look-kind');
    picture.append(content);
    try {
      await image.decode();
      look = image;
      status.textContent = '';
    } catch {
      image.remove();
      kind.remove();
      if (pinned) status.textContent = status.dataset.error;
      hovered = false;
      pinned = false;
    } finally {
      pending = false;
      update();
    }
  }

  card.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    hovered = true;
    update();
  });
  card.addEventListener('pointerleave', () => {
    hovered = false;
    update();
  });
  toggle.addEventListener('click', () => {
    pinned = !pinned;
    if (!pinned) hovered = false;
    if (!pinned) status.textContent = '';
    update();
  });
  card.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || (!pinned && !hovered)) return;
    pinned = false;
    hovered = false;
    status.textContent = '';
    update();
  });
  toggle.hidden = false;
});
