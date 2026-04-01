import { AppBar } from '@components/app-bar';
import { Layout, Typography } from 'antd';

import styles from './help-page.module.css';

export const HelpPage = () => {
  return (
    <Layout className={styles.page}>
      <AppBar active="help" />

      <Layout.Content className={styles.content}>
        <Typography.Title level={4}>Справка</Typography.Title>

        <Typography.Title level={5}>Баннер отладки Chrome</Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 20 }}>
          <strong>Инструмент ReqForge запустил отладку браузера</strong> — это уведомление должно
          оставаться открытым. Если нажать «Отмена» — перехват запросов прекратится для текущей
          вкладки до переоткрытия расширения.
        </Typography.Paragraph>

        <Typography.Title level={5}>Переключение вкладок при перехвате</Typography.Title>
        <Typography.Paragraph style={{ marginBottom: 20 }}>
          Пока есть необработанные перехваченные запросы, расширение удерживает отладчик на исходной
          вкладке — вы можете спокойно переключаться на другие вкладки, чтобы скопировать нужные
          данные. Запросы не будут пропущены автоматически. Отладчик переключится на новую вкладку
          только после того, как все ожидающие запросы будут обработаны.
        </Typography.Paragraph>

        <Typography.Title level={5}>Запросы не перехватываются</Typography.Title>
        <Typography.Paragraph>Возможные причины:</Typography.Paragraph>
        <Typography.Paragraph>
          <strong>1. Service Worker сайта</strong> — сайт может обрабатывать запросы через
          собственный SW, минуя сеть. Решение: открыть DevTools → Application → Service Workers →
          поставить галку <strong>«Bypass for network»</strong> (или нажать Unregister). После этого
          запросы пойдут через сеть и будут перехвачены.
        </Typography.Paragraph>
        <Typography.Paragraph>
          <strong>2. Закрыт баннер отладки</strong> — см. раздел выше.
        </Typography.Paragraph>
        <Typography.Paragraph>
          <strong>3. Запросы из iframe / web worker</strong> — перехватываются только запросы
          основного фрейма страницы.
        </Typography.Paragraph>
      </Layout.Content>
    </Layout>
  );
};
