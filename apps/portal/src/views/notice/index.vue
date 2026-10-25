<script setup lang="ts">
/**
 * 站内信（通知中心）
 * 用户查看自己的通知，支持已读/未读筛选、标记已读、全部已读、删除。
 * 平台管理员额外拥有「发送通知」能力（全体 / 指定租户）。
 */
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import type { NoticeMessageView, MessageType, MessageTargetType, Tenant } from '@saas/shared';
import { messageApi, tenantApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { PageHeader } from '@saas/ui';

const auth = useAuthStore();
const isPlatformAdmin = auth.isPlatformAdmin;

const loading = ref(false);
const list = ref<NoticeMessageView[]>([]);
const total = ref(0);
const readStatus = ref<'all' | 'unread' | 'read'>('all');
const typeFilter = ref<MessageType | ''>('');

const query = reactive({ page: 1, pageSize: 10 });

// 发送通知弹窗
const sendDialogVisible = ref(false);
const sendFormRef = ref<FormInstance>();
const sendSubmitting = ref(false);
const tenants = ref<Tenant[]>([]);
const sendForm = reactive({
  title: '',
  content: '',
  type: 'system' as MessageType,
  targetType: 'all' as MessageTargetType,
  targetIds: [] as string[],
});

const sendRules: FormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }],
};

const typeDict: { label: string; value: MessageType; color: 'info' | 'primary' | 'warning' }[] = [
  { label: '系统', value: 'system', color: 'info' },
  { label: '业务', value: 'business', color: 'primary' },
  { label: '告警', value: 'warning', color: 'warning' },
];

async function load() {
  loading.value = true;
  try {
    const res = await messageApi
      .list({
        userId: auth.user?.id ?? '',
        readStatus: readStatus.value,
        type: typeFilter.value,
        page: query.page,
        pageSize: query.pageSize,
      })
      .send();
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function switchReadStatus(val: string | number | boolean | undefined) {
  readStatus.value = (val as 'all' | 'unread' | 'read') ?? 'all';
  query.page = 1;
  load();
}

function switchType(val: MessageType | '') {
  typeFilter.value = val;
  query.page = 1;
  load();
}

async function markRead(row: NoticeMessageView) {
  if (row.isRead) return;
  await messageApi.read(row.id, auth.user?.id ?? '').send();
  row.isRead = true;
  load();
}

async function markAllRead() {
  await messageApi.readAll(auth.user?.id ?? '').send();
  ElMessage.success('已全部标记为已读');
  load();
}

async function remove(row: NoticeMessageView) {
  await messageApi.remove(row.id, auth.user?.id).send();
  ElMessage.success('已删除');
  load();
}

async function openSend() {
  if (tenants.value.length === 0) {
    tenants.value = (await tenantApi.list({ page: 1, pageSize: 100 }).send()).list;
  }
  Object.assign(sendForm, { title: '', content: '', type: 'system', targetType: 'all', targetIds: [] });
  sendDialogVisible.value = true;
}

async function submitSend() {
  if (!sendFormRef.value) return;
  await sendFormRef.value.validate(async (valid) => {
    if (!valid) return;
    sendSubmitting.value = true;
    try {
      await messageApi
        .send({
          title: sendForm.title,
          content: sendForm.content,
          type: sendForm.type,
          targetType: sendForm.targetType,
          targetIds: sendForm.targetType === 'all' ? undefined : sendForm.targetIds,
          sender: auth.user?.nickname ?? '系统',
        })
        .send();
      ElMessage.success('发送成功');
      sendDialogVisible.value = false;
    } catch (e) {
      ElMessage.error((e as Error).message || '发送失败');
    } finally {
      sendSubmitting.value = false;
    }
  });
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader title="站内信" description="查看系统与平台发送的通知，支持已读未读管理与一键全部已读">
      <template #actions>
        <el-button @click="markAllRead">全部已读</el-button>
        <el-button v-if="isPlatformAdmin" type="primary" @click="openSend">
          <el-icon class="mr-1"><component :is="'Promotion'" /></el-icon>发送通知
        </el-button>
      </template>
    </PageHeader>

    <div class="bg-white rounded-card shadow-card p-3 mb-4">
      <div class="flex items-center gap-4">
        <el-radio-group v-model="readStatus" @change="switchReadStatus">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="unread">未读</el-radio-button>
          <el-radio-button value="read">已读</el-radio-button>
        </el-radio-group>
        <el-select v-model="typeFilter" placeholder="消息类型" clearable style="width: 140px" @change="switchType">
          <el-option v-for="t in typeDict" :key="t.value" :label="t.label" :value="t.value" />
        </el-select>
      </div>
    </div>

    <div class="bg-white rounded-card shadow-card">
      <el-table v-loading="loading" :data="list">
        <el-table-column label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="typeDict.find((t) => t.value === row.type)?.color" size="small" effect="light">
              {{ typeDict.find((t) => t.value === row.type)?.label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="200">
          <template #default="{ row }">
            <span class="flex items-center gap-1.5">
              <span v-if="!row.isRead" class="w-2 h-2 rounded-full bg-[var(--el-color-danger)]" />
              <span :class="{ 'font-medium': !row.isRead }">{{ row.title }}</span>
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="content" label="内容" min-width="320" show-overflow-tooltip />
        <el-table-column prop="sender" label="发送者" width="120" />
        <el-table-column label="时间" width="170">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-if="!row.isRead" link type="primary" @click="markRead(row as NoticeMessageView)">标记已读</el-button>
            <el-button link type="danger" @click="remove(row as NoticeMessageView)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end p-4">
        <el-pagination
          v-model:current-page="query.page"
          :page-size="query.pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="load"
        />
      </div>
    </div>

    <el-dialog v-model="sendDialogVisible" title="发送通知" width="560px">
      <el-form ref="sendFormRef" :model="sendForm" :rules="sendRules" label-width="90px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="sendForm.title" placeholder="通知标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input v-model="sendForm.content" type="textarea" :rows="4" placeholder="通知内容" />
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="sendForm.type">
            <el-radio-button value="system">系统</el-radio-button>
            <el-radio-button value="business">业务</el-radio-button>
            <el-radio-button value="warning">告警</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="接收范围">
          <el-radio-group v-model="sendForm.targetType">
            <el-radio value="all">全体用户</el-radio>
            <el-radio value="tenant">指定租户</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="sendForm.targetType === 'tenant'" label="目标租户">
          <el-select v-model="sendForm.targetIds" multiple filterable placeholder="选择租户" style="width: 100%">
            <el-option v-for="t in tenants" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sendDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="sendSubmitting" @click="submitSend">发送</el-button>
      </template>
    </el-dialog>
  </div>
</template>
