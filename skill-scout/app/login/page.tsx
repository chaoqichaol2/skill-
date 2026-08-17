import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await isAuthenticated()) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">S</span>
          <div><strong>SKILL SCOUT</strong><span>PRIVATE CONSOLE</span></div>
        </div>
        <div className="login-copy">
          <p className="kicker">仅限管理员访问</p>
          <h1>回到你的<br />Skill 工作台</h1>
          <p>候选收集、实测评分和推荐结论都集中在这里。</p>
        </div>
        <form className="login-form" action="/api/login" method="post">
          <label htmlFor="password">访问密码</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          {error ? <p className="form-error" role="alert">密码不正确，请重新输入。</p> : null}
          <button type="submit">进入后台 <span aria-hidden="true">→</span></button>
        </form>
        <p className="login-foot">tideflow.cloud · 单用户私有空间</p>
      </section>
      <aside className="login-visual" aria-hidden="true">
        <div className="orb"><span>9.1</span><small>本期评分</small></div>
        <div className="grid-mark grid-mark-one">01</div>
        <div className="grid-mark grid-mark-two">SCOUT</div>
      </aside>
    </main>
  );
}
