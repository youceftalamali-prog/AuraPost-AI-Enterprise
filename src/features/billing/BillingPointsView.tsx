import { useEffect, useMemo, useState } from 'react';
import { Check, Coins, Sparkles, Wallet, Zap } from 'lucide-react';
import type { AgentLocale } from '../agent-shell/types';
import {
	SEED_PACKS,
	SEED_PLANS,
	formatPoints,
	formatUsd,
	packUnitPriceUsd,
	pointsToUsd,
	estimateOperationsPoints,
	type EstimatorOperation,
} from './pointsCatalog';
import { loadPointsBalance, type PointsBalance } from './pointsApi';

interface Props {
	locale: AgentLocale;
}

const copy = {
	ar: {
		title: 'الفوترة والنقاط',
		subtitle: 'النقطة الواحدة = 0.01$. اختر خطة شهرية أو اشترِ حزمة نقاط إضافية، وقدّر تكلفة التوليد قبل الصرف.',
		balance: 'رصيد مساحة العمل',
		available: 'المتاح',
		reserved: 'المحجوز',
		spent: 'المصروف الكلي',
		noBalance: 'لا يتوفر رصيد بعد. سيظهر هنا بمجرد أول عملية أو منحة نقاط.',
		plans: 'الخطط الشهرية',
		packs: 'حزم النقاط الإضافية',
		perMonth: '/ شهريًا',
		perYear: 'سنويًا',
		pointsMo: 'نقطة / شهر',
		custom: 'حسب الطلب',
		contactUs: 'تواصل معنا',
		choose: 'اختر الخطة',
		current: 'الحالية',
		buy: 'شراء',
		best: 'أفضل قيمة',
		estimator: 'مقدّر التكلفة',
		estimatorHint: 'أدخل كميات العمليات لتقدير النقاط قبل التوليد.',
		images: 'صور',
		clips: 'مقاطع فيديو',
		avatars: 'فيديو أفتار',
		renders: 'تجميع/تصيير',
		ttsChars: 'أحرف تعليق صوتي',
		estTotal: 'الإجمالي المقدّر',
		points: 'نقطة',
	},
	fr: {
		title: 'Facturation & points',
		subtitle: '1 point = 0,01 $. Choisissez un forfait mensuel ou un pack de points, et estimez le coût avant de générer.',
		balance: "Solde de l'espace",
		available: 'Disponible',
		reserved: 'Réservé',
		spent: 'Total dépensé',
		noBalance: "Aucun solde pour l'instant. Il apparaîtra dès la première opération ou attribution.",
		plans: 'Forfaits mensuels',
		packs: 'Packs de points',
		perMonth: '/ mois',
		perYear: 'par an',
		pointsMo: 'points / mois',
		custom: 'Sur mesure',
		contactUs: 'Nous contacter',
		choose: 'Choisir',
		current: 'Actuel',
		buy: 'Acheter',
		best: 'Meilleure offre',
		estimator: 'Estimateur de coût',
		estimatorHint: 'Saisissez les quantités pour estimer les points avant génération.',
		images: 'Images',
		clips: 'Clips vidéo',
		avatars: 'Vidéo avatar',
		renders: 'Assemblage/rendu',
		ttsChars: 'Caractères voix off',
		estTotal: 'Total estimé',
		points: 'points',
	},
	en: {
		title: 'Billing & Points',
		subtitle: '1 point = $0.01. Pick a monthly plan or buy a top-up pack, and estimate generation cost before you spend.',
		balance: 'Workspace balance',
		available: 'Available',
		reserved: 'Reserved',
		spent: 'Lifetime spent',
		noBalance: 'No balance yet. It will appear here after your first operation or points grant.',
		plans: 'Monthly plans',
		packs: 'Point packs',
		perMonth: '/ mo',
		perYear: 'per year',
		pointsMo: 'points / mo',
		custom: 'Custom',
		contactUs: 'Contact us',
		choose: 'Choose plan',
		current: 'Current',
		buy: 'Buy',
		best: 'Best value',
		estimator: 'Cost estimator',
		estimatorHint: 'Enter operation quantities to estimate points before generating.',
		images: 'Images',
		clips: 'Video clips',
		avatars: 'Avatar video',
		renders: 'Assembly/render',
		ttsChars: 'Voiceover characters',
		estTotal: 'Estimated total',
		points: 'points',
	},
} satisfies Record<AgentLocale, Record<string, string>>;

export default function BillingPointsView({ locale }: Props) {
	const t = copy[locale];
	const rtl = locale === 'ar';
	const [balance, setBalance] = useState<PointsBalance | null>(null);
	const [imageQty, setImageQty] = useState(0);
	const [clipQty, setClipQty] = useState(0);
	const [avatarQty, setAvatarQty] = useState(0);
	const [renderQty, setRenderQty] = useState(0);
	const [ttsChars, setTtsChars] = useState(0);

	useEffect(() => {
		const controller = new AbortController();
		loadPointsBalance(controller.signal)
			.then((next) => setBalance(next))
			.catch(() => setBalance(null));
		return () => controller.abort();
	}, []);

	const operations = useMemo<EstimatorOperation[]>(() => {
		const ops: EstimatorOperation[] = [];
		if (imageQty > 0) ops.push({ kind: 'image', quantity: imageQty });
		if (clipQty > 0) ops.push({ kind: 'video_clip', quantity: clipQty });
		if (avatarQty > 0) ops.push({ kind: 'avatar_video', quantity: avatarQty });
		if (renderQty > 0) ops.push({ kind: 'assembly_render', quantity: renderQty });
		if (ttsChars > 0) ops.push({ kind: 'tts', characters: ttsChars });
		return ops;
	}, [imageQty, clipQty, avatarQty, renderQty, ttsChars]);

	const estPoints = useMemo(
		() => (operations.length > 0 ? estimateOperationsPoints(operations) : 0),
		[operations],
	);

	const cheapestPackId = useMemo(() => {
		return [...SEED_PACKS].sort((a, b) => packUnitPriceUsd(a) - packUnitPriceUsd(b))[0]?.id;
	}, []);

	const numberFields: Array<{ label: string; value: number; set: (n: number) => void; step: number }> = [
		{ label: t.images, value: imageQty, set: setImageQty, step: 1 },
		{ label: t.clips, value: clipQty, set: setClipQty, step: 1 },
		{ label: t.avatars, value: avatarQty, set: setAvatarQty, step: 1 },
		{ label: t.renders, value: renderQty, set: setRenderQty, step: 1 },
		{ label: t.ttsChars, value: ttsChars, set: setTtsChars, step: 100 },
	];

	return (
		<div dir={rtl ? 'rtl' : 'ltr'} className="space-y-6">
			<div className="flex flex-col gap-4 rounded-3xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 via-[#11131d] to-emerald-500/10 p-6">
				<div className="flex items-start gap-3">
					<span className="rounded-xl bg-indigo-500/15 p-3">
						<Wallet className="h-6 w-6 text-indigo-300" />
					</span>
					<div>
						<h2 className="text-2xl font-bold text-white">{t.title}</h2>
						<p className="mt-1 max-w-2xl text-sm text-slate-400">{t.subtitle}</p>
					</div>
				</div>
				<div className="grid gap-3 sm:grid-cols-3">
					<div className="rounded-2xl border border-white/10 bg-black/30 p-4">
						<p className="text-[11px] uppercase tracking-wide text-slate-500">{t.available}</p>
						<p className="mt-1 text-2xl font-bold text-emerald-300">
							{balance ? formatPoints(balance.balancePoints) : '—'}
						</p>
						{balance && (
							<p className="text-[11px] text-slate-500">≈ {formatUsd(pointsToUsd(balance.balancePoints))}</p>
						)}
					</div>
					<div className="rounded-2xl border border-white/10 bg-black/30 p-4">
						<p className="text-[11px] uppercase tracking-wide text-slate-500">{t.reserved}</p>
						<p className="mt-1 text-2xl font-bold text-amber-300">
							{balance ? formatPoints(balance.reservedPoints) : '—'}
						</p>
					</div>
					<div className="rounded-2xl border border-white/10 bg-black/30 p-4">
						<p className="text-[11px] uppercase tracking-wide text-slate-500">{t.spent}</p>
						<p className="mt-1 text-2xl font-bold text-slate-200">
							{balance ? formatPoints(balance.lifetimeSpent) : '—'}
						</p>
					</div>
				</div>
				{!balance && <p className="text-xs text-slate-500">{t.noBalance}</p>}
			</div>

			<section className="space-y-3">
				<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
					<Sparkles className="h-4 w-4 text-indigo-300" />
					{t.plans}
				</h3>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
					{SEED_PLANS.map((plan) => (
						<article key={plan.id} className="flex flex-col rounded-3xl border border-white/10 bg-[#11131d] p-5">
							<h4 className="text-lg font-bold text-white">{plan.label}</h4>
							<div className="mt-2">
								{plan.isCustom ? (
									<p className="text-2xl font-bold text-indigo-300">{t.custom}</p>
								) : (
									<p className="text-2xl font-bold text-white">
										{formatUsd(plan.monthlyPriceUsd ?? 0)}
										<span className="text-xs font-normal text-slate-500"> {t.perMonth}</span>
									</p>
								)}
								{!plan.isCustom && (
									<p className="mt-0.5 text-xs text-emerald-300">
										{formatPoints(plan.monthlyPoints)} {t.pointsMo}
									</p>
								)}
							</div>
							<ul className="mt-3 flex-1 space-y-1.5">
								{plan.highlights[locale].map((line) => (
									<li key={line} className="flex items-start gap-2 text-xs text-slate-400">
										<Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
										<span>{line}</span>
									</li>
								))}
							</ul>
							<button
								type="button"
								className="mt-4 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
							>
								{plan.isCustom ? t.contactUs : t.choose}
							</button>
						</article>
					))}
				</div>
			</section>

			<section className="space-y-3">
				<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
					<Coins className="h-4 w-4 text-amber-300" />
					{t.packs}
				</h3>
				<div className="grid gap-4 sm:grid-cols-3">
					{SEED_PACKS.map((pack) => (
						<article key={pack.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#11131d] p-5">
							<div>
								<p className="text-lg font-bold text-white">{formatPoints(pack.points)}</p>
								<p className="text-xs text-slate-500">{t.points}</p>
								{pack.id === cheapestPackId && (
									<span className="mt-1 inline-block rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-200">
										{t.best}
									</span>
								)}
							</div>
							<div className="text-right">
								<p className="text-lg font-bold text-white">{formatUsd(pack.priceUsd)}</p>
								<button
									type="button"
									className="mt-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-400/20"
								>
									{t.buy}
								</button>
							</div>
						</article>
					))}
				</div>
			</section>

			<section className="space-y-3 rounded-3xl border border-white/10 bg-[#11131d] p-6">
				<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
					<Zap className="h-4 w-4 text-indigo-300" />
					{t.estimator}
				</h3>
				<p className="text-xs text-slate-500">{t.estimatorHint}</p>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
					{numberFields.map((field) => (
						<label key={field.label} className="flex flex-col gap-1 text-xs text-slate-400">
							{field.label}
							<input
								type="number"
								min={0}
								step={field.step}
								value={field.value}
								onChange={(event) => field.set(Math.max(0, Number(event.target.value) || 0))}
								className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
							/>
						</label>
					))}
				</div>
				<div className="flex items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
					<span className="text-sm text-slate-300">{t.estTotal}</span>
					<span className="text-lg font-bold text-emerald-300">
						{formatPoints(estPoints)} {t.points}
						<span className="ms-2 text-xs font-normal text-slate-500">≈ {formatUsd(pointsToUsd(estPoints))}</span>
					</span>
				</div>
			</section>
		</div>
	);
}
