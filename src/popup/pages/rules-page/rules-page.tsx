import { Alert, Layout, Splitter } from 'antd';

import { AppBar } from './app-bar';
import { RuleForm } from './rule-form';
import { RulesList } from './rules-list';
import styles from './rules-page.module.css';

export const RulesPage = () => {
  return (
    <Layout className={styles.page}>
      <AppBar />
      <Alert
        banner
        type="warning"
        title="Если закрыть предупреждение Chrome об отладке — правила перестанут применяться. Чтобы снова включить перехват, переключите любое правило (выкл → вкл)."
      />
      <Layout.Content className={styles.content}>
        <Splitter>
          <Splitter.Panel defaultSize="60%" min="40%">
            <RulesList />
          </Splitter.Panel>
          <Splitter.Panel min="30%">
            <RuleForm />
          </Splitter.Panel>
        </Splitter>
      </Layout.Content>
    </Layout>
  );
};
