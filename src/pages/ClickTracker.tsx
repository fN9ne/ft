import Flex from "@/components/Flex";
import Keyboard from "@/components/Keyboard";
import Mouse from "@/components/Mouse";
import Widget from "@/components/UI/Widget";
import { useActions } from "@/hooks/useActions";
import { useAppSelector } from "@/hooks/useAppSelector";
import useRealtimeData from "@/hooks/useRealtimeData";
import supabase from "@/services/supabase";
import { Data } from "@/types";
import { FC, useEffect, useRef, useState } from "react";

const ClickTracker: FC = () => {
	const { updateData, updateLastButtonClicked, updateLastKeyPressed } = useActions();

	const { keyboardCount, rmbCount, lmbCount, lastClickTime, lastKeyPressTime } = useAppSelector((state) => state.main);

	const prevKeyboardDataRef = useRef<Data["keyboardCount"]>({});
	const prevMouseDataRef = useRef<[Data["lmbCount"], Data["rmbCount"]]>([0, 0]);

	const [formattedLastKeyPressTime, setFormattedLastKeyPressTime] = useState<string>("");
	const [formattedLastClickTime, setFormattedLastClickTime] = useState<string>("");

	useEffect(() => {
		const getData = async () => {
			const { data } = await supabase.from("clickTracker").select("*").eq("date", new Date().toLocaleDateString());

			if (data) {
				updateData(data[0]);
			}
		};

		getData();
	}, []);

	const handleUpdate = (data: Data | null) => {
		if (data) {
			/* keyboard */

			const prevKeyboardData = prevKeyboardDataRef.current;

			const changedKeys = Object.keys(data.keyboardCount).filter((key) => {
				return data.keyboardCount[key] !== (prevKeyboardData[key] || 0);
			});

			if (changedKeys.length > 1) {
				updateLastKeyPressed(null);
			} else if (changedKeys.length > 0) {
				updateLastKeyPressed(changedKeys[changedKeys.length - 1]);

				setTimeout(() => {
					updateLastKeyPressed(null);
				}, 500);
			}

			/* mouse */

			const { lmbCount, rmbCount } = data;

			const prevMouseData = prevMouseDataRef.current;

			const changedClicks = [lmbCount > prevMouseData[0] ? "LMB" : null, rmbCount > prevMouseData[1] ? "RMB" : null].filter(
				Boolean
			) as string[];

			if (changedClicks.length > 1) {
				updateLastButtonClicked(null);
			} else if (changedClicks.length > 0) {
				updateLastButtonClicked(changedClicks[changedClicks.length - 1]);

				setTimeout(() => {
					updateLastButtonClicked(null);
				}, 500);
			}

			updateData(data);

			prevKeyboardDataRef.current = data.keyboardCount;
			prevMouseDataRef.current = [lmbCount, rmbCount];
		}
	};

	useRealtimeData(handleUpdate);

	useEffect(() => {
		if (lastKeyPressTime) {
			setFormattedLastKeyPressTime(formatTimeAgo(lastKeyPressTime));
		}
		if (lastClickTime) {
			setFormattedLastClickTime(formatTimeAgo(lastClickTime));
		}
	}, [lastKeyPressTime, lastClickTime]);

	useEffect(() => {
		const intervalId = setInterval(() => {
			if (lastKeyPressTime) {
				setFormattedLastKeyPressTime(formatTimeAgo(lastKeyPressTime));
			}
			if (lastClickTime) {
				setFormattedLastClickTime(formatTimeAgo(lastClickTime));
			}
		}, 1000);

		return () => clearInterval(intervalId);
	}, [lastKeyPressTime, lastClickTime]);

	const formatNumber = (number: number): string => {
		return new Intl.NumberFormat("en-US").format(number).replace(",", " ");
	};

	const getTotalKeyPressCount = (keyboardCount: Data["keyboardCount"]): string => {
		return formatNumber(Object.values(keyboardCount).reduce((total, count) => total + count, 0));
	};

	const getTotalClicksCount = (rmbCount: number, lmbCount: number) => {
		return formatNumber(rmbCount + lmbCount);
	};

	const getMostPressedKey = (keyboardCount: Data["keyboardCount"]): string | null => {
		if (Object.keys(keyboardCount).length === 0) {
			return null;
		}

		let maxCount = -1;
		let mostPressedKey: string | null = null;

		for (const [key, count] of Object.entries(keyboardCount)) {
			if (count > maxCount) {
				maxCount = count;
				mostPressedKey = key;
			}
		}

		return `${mostPressedKey} (${formatNumber(maxCount)})`;
	};

	const formatTimeAgo = (dateString: string): string => {
		const now = new Date();
		const past = new Date(dateString);
		const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

		if (seconds < 60) {
			return `${seconds} ${seconds === 1 ? "second" : "seconds"} ago`;
		}

		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) {
			return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
		}

		const hours = Math.floor(minutes / 60);
		return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
	};

	return (
		<Flex column gap={40} justifyContent="center">
			<Flex gap={40}>
				<Keyboard />
				<Mouse />
			</Flex>
			<Flex gap={24}>
				<Widget label="Total presses" value={getTotalKeyPressCount(keyboardCount)} />
				<Widget label="Total clicks" value={getTotalClicksCount(rmbCount, lmbCount)} />
				<Widget label="Most pressed key" value={getMostPressedKey(keyboardCount) || "No"} />
				<Widget label="Last click time" value={formattedLastClickTime} />
				<Widget label="Last key press time" value={formattedLastKeyPressTime} />
			</Flex>
		</Flex>
	);
};

export default ClickTracker;
