/**
 * ユーザーマニュアル用のスクリーンショット撮影スクリプト
 *
 * 使い方:
 *   npx tsx scripts/capture-screenshots.ts                          # ローカル (localhost:3000)
 *   npx tsx scripts/capture-screenshots.ts https://example.com pwd  # 本番URL + パスワード
 */
import { chromium, type Page } from '@playwright/test';
import path from 'path';

const SCREENSHOTS_DIR = path.join(process.cwd(), 'docs', 'screenshots');
const BASE_URL = process.argv[2] || 'http://localhost:3000';
const PASSWORD = process.argv[3] || 'admin123';

/** ページ遷移してデータ読み込みを待つヘルパー */
async function gotoAndWait(page: Page, url: string, waitSelector?: string, timeout = 5000) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  if (waitSelector) {
    await page.waitForSelector(waitSelector, { timeout: 30000 }).catch(() => {
      console.log(`  ⚠ セレクタ "${waitSelector}" が見つかりませんでした`);
    });
  }
  // SWRフェッチ＋レンダリング完了を待つ
  await page.waitForTimeout(timeout);
}

/** スクリーンショット撮影ヘルパー */
async function capture(page: Page, filename: string, fullPage = true) {
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, filename),
    fullPage,
  });
  console.log(`  ✓ ${filename}`);
}

async function captureScreenshots() {
  console.log(`ブラウザを起動中... (${BASE_URL})`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  try {
    // === 1. ログイン画面 ===
    console.log('1. ログイン画面をキャプチャ中...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForSelector('button[type="submit"]', { timeout: 30000 });
    await page.waitForTimeout(1000);
    await capture(page, '01-login.png', false);

    // === ログイン実行 ===
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 60000 });

    // === 2. ダッシュボード ===
    console.log('2. ダッシュボードをキャプチャ中...');
    // ダッシュボードの各セクションがデータ読み込み完了するまで待つ
    // 運用ルール・メーカー別原価・変更履歴はそれぞれ独立したSWRフェッチ
    await page.waitForSelector('text=メーカー別原価合計', { timeout: 10000 }).catch(() => {});
    // メーカー別原価のソートボタン or データ行 or 「データがありません」が表示されるまで
    await page.waitForSelector('text=メーカー, text=データがありません', { timeout: 15000 }).catch(async () => {
      // フォールバック: さらに待機
      await page.waitForTimeout(5000);
    });
    // 変更履歴のデータが表示されるまで
    await page.waitForSelector('text=作成, text=編集, text=変更履歴がありません', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
    await capture(page, '02-dashboard.png');

    // === 3. アイテム一覧（商品タブ） ===
    console.log('3. アイテム一覧（商品）をキャプチャ中...');
    await gotoAndWait(page, `${BASE_URL}/items?type=PRODUCT`, 'table tbody tr', 3000);
    await capture(page, '03-items-list-product.png');

    // === 4. アイテム一覧（委託品タブ） ===
    console.log('4. アイテム一覧（委託品）をキャプチャ中...');
    // URLで直接遷移（タブクリックだとデータフェッチ待ちが不安定）
    await gotoAndWait(page, `${BASE_URL}/items?type=CONSIGNMENT`, 'table tbody tr', 3000);
    await capture(page, '04-items-list-consignment.png');

    // === 5. グリッドビュー ===
    console.log('5. グリッドビューをキャプチャ中...');
    // リストビューでデータ読み込み後、グリッドに切り替え
    await gotoAndWait(page, `${BASE_URL}/items?type=PRODUCT`, 'table tbody tr', 3000);
    const gridBtn = page.locator('button[title="写真表示"]').first();
    if (await gridBtn.isVisible()) {
      await gridBtn.click();
      // グリッドカードのコンテンツ（アイテム名テキスト）が表示されるまで待つ
      await page.waitForSelector('[role="button"] >> text=¥', { timeout: 10000 }).catch(() => {
        console.log('  ⚠ グリッドカードの価格テキストが見つかりませんでした');
      });
      await page.waitForTimeout(2000);
    }
    await capture(page, '05-items-grid-view.png');

    // === 6. アイテム詳細 ===
    console.log('6. アイテム詳細をキャプチャ中...');
    // まずアイテム一覧からIDを取得
    await gotoAndWait(page, `${BASE_URL}/items?type=PRODUCT`, 'table tbody tr', 3000);
    const firstItemId = await page.evaluate(() => {
      const row = document.querySelector('table tbody tr');
      if (!row) return null;
      // 行のonClickから遷移先URLを取得するか、セル内容からIDを探す
      // SKU列のテキストからアイテムを特定し、APIで取得する方法もあるが、
      // ここでは行クリック後のURL変更を監視する
      return row.getAttribute('data-id') || null;
    });

    // 行クリックで詳細ページへ遷移
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      // クリック前のURLを記憶
      const listUrl = page.url();
      await firstRow.click();

      // URLが変わるまで待つ（items/[cuid] 形式）
      await page.waitForFunction(
        (prevUrl) => window.location.href !== prevUrl,
        listUrl,
        { timeout: 15000 }
      );

      // 詳細ページのデータ読み込みを待つ（「基本情報」セクションが表示されるまで）
      await page.waitForSelector('text=基本情報', { timeout: 15000 }).catch(() => {
        console.log('  ⚠ 「基本情報」セクションが見つかりませんでした');
      });
      await page.waitForTimeout(2000);
      await capture(page, '06-item-detail.png');

      // === 7. アイテム編集画面 ===
      console.log('7. アイテム編集画面をキャプチャ中...');
      // 現在のURL（詳細ページ）から /edit URLを構築
      const detailUrl = page.url().split('?')[0]; // クエリパラメータを除去
      await gotoAndWait(page, `${detailUrl}/edit`, 'input[name="name"]', 5000);
      await capture(page, '07-item-edit.png');
    }

    // === 8. アイテム新規登録画面 ===
    console.log('8. アイテム新規登録画面をキャプチャ中...');
    await gotoAndWait(page, `${BASE_URL}/items/new`, 'input[name="name"]', 3000);
    await capture(page, '08-item-new.png');

    // === 9. メーカー管理画面 ===
    console.log('9. メーカー管理画面をキャプチャ中...');
    await gotoAndWait(page, `${BASE_URL}/manufacturers`, 'table tbody tr', 3000);
    await capture(page, '09-manufacturers.png');

    // === 10. 品目管理画面 ===
    console.log('10. 品目管理画面をキャプチャ中...');
    await gotoAndWait(page, `${BASE_URL}/categories`, 'table tbody tr', 3000);
    await capture(page, '10-categories.png');

    // === 11. 場所管理画面 ===
    console.log('11. 場所管理画面をキャプチャ中...');
    await gotoAndWait(page, `${BASE_URL}/locations`, 'table tbody tr', 3000);
    await capture(page, '11-locations.png');

    // === 12. タグ管理画面 ===
    console.log('12. タグ管理画面をキャプチャ中...');
    await gotoAndWait(page, `${BASE_URL}/tags`, 'table tbody tr', 3000);
    await capture(page, '12-tags.png');

    // === 13. 素材項目管理画面 ===
    console.log('13. 素材項目管理画面をキャプチャ中...');
    await gotoAndWait(page, `${BASE_URL}/material-types`, 'table tbody tr', 3000);
    await capture(page, '13-material-types.png');

    // === 14. ユーザー管理画面（管理者のみ） ===
    console.log('14. ユーザー管理画面をキャプチャ中...');
    await gotoAndWait(page, `${BASE_URL}/admin/console`, 'table tbody tr', 3000);
    await capture(page, '14-admin-console.png');

    console.log('\n✅ すべてのスクリーンショットを撮影しました！');
    console.log(`📁 保存先: ${SCREENSHOTS_DIR}`);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
