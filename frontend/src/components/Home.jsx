import React from 'react';
import { PenTool, FileText, ArrowRight } from 'lucide-react';

export default function Home({ onNavigate }) {
    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '100px 20px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '10px' }}>
                <span className="gradient-text">影刀</span> 离线单据识别
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '60px' }}>
                企业级智能文档处理平台：从模板定义到自动化数据提取
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>

                {/* 模板制作卡片 */}
                <div
                    className="glass-card home-card"
                    onClick={() => onNavigate('creator')}
                    style={{
                        padding: '40px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        transition: 'all 0.3s ease',
                        border: '1px solid var(--glass-border)'
                    }}
                >
                    <div style={{
                        width: '60px', height: '60px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--primary-color)', marginBottom: '20px'
                    }}>
                        <PenTool size={32} />
                    </div>
                    <h2 style={{ marginBottom: '10px', fontSize: '1.5rem' }}>模板制作</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', lineHeight: '1.6' }}>
                        上传样张，通过 AI 辅助标注区域，定义表格提取规则，生成标准化的提取模板。
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                        开始制作 <ArrowRight size={16} style={{ marginLeft: '5px' }} />
                    </div>
                </div>

                {/* 模板引用卡片 */}
                <div
                    className="glass-card home-card"
                    onClick={() => onNavigate('reference')}
                    style={{
                        padding: '40px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        position: 'relative',
                        transition: 'all 0.3s ease',
                        border: '1px solid var(--glass-border)'
                    }}
                >
                    <div style={{
                        width: '60px', height: '60px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--success-color)', marginBottom: '20px'
                    }}>
                        <FileText size={32} />
                    </div>
                    <h2 style={{ marginBottom: '10px', fontSize: '1.5rem' }}>模板引用 & 执行</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', lineHeight: '1.6' }}>
                        基于已发布的模板，批量处理业务单据。预览提取结果，获取 API 调用代码。
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--success-color)', fontWeight: 'bold' }}>
                        去引用 <ArrowRight size={16} style={{ marginLeft: '5px' }} />
                    </div>
                </div>

            </div>
        </div>
    );
}
