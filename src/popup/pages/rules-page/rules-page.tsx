import { Splitter } from 'antd';

import { AppBar } from './app-bar';
import { RuleForm } from './rule-form';
import { RulesList } from './rules-list';
import styles from './rules-page.module.css';

export function RulesPage() {
  return (
    <div className={styles.page}>
      <AppBar />
      <div className={styles.content}>
        <Splitter>
          <Splitter.Panel defaultSize="60%" min="40%">
            <RulesList />
          </Splitter.Panel>
          <Splitter.Panel min="30%">
            <RuleForm />
          </Splitter.Panel>
        </Splitter>
      </div>
    </div>
  );
}
