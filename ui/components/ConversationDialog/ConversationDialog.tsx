import { Button } from "@kit/Button";
import type { DialogProps } from "@kit/Dialog";
import { Dialog } from "@kit/Dialog";
import { DialogActions } from "@kit/DialogActions";
import Text from "@kit/Text";
import clsx from "clsx";
import React from "react";
import type {
  ConversationLine,
  MissionConversation,
} from "@core/systems/mission/types";
import { Scrollbar } from "@kit/Scrollbar";
import { BaseButton } from "@kit/BaseButton";
import { usesize } from "@kit/theming/style";
import styles from "./styles.scss";

export interface ConversationDialogProps extends DialogProps {
  conversation: MissionConversation;
  onEnd: (_flags: Record<string, string>) => void;
}

type Log = { line: ConversationLine; actor: string }[];

const OptionButton: React.FC<
  React.PropsWithChildren<{ onClick: () => void; index: number }>
> = ({ index, onClick, children }) => (
  <BaseButton className={styles.option} onClick={onClick}>
    <span className={styles.optionIndex}>{index}.</span>
    <span className={styles.optionContent}>{children}</span>
  </BaseButton>
);

export const ConversationDialog: React.FC<ConversationDialogProps> = ({
  conversation,
  onClose,
  onEnd,
  ...dialogProps
}) => {
  const scrollableRef = React.useRef<any>(null);
  const [flags, setFlags] = React.useState<Record<string, string>>({});
  const [log, setLog] = React.useState<Log>(() => {
    const [actor, line] = conversation.Start.split(".");

    return [
      {
        line: conversation.Actors[actor].lines[line],
        actor,
      },
    ];
  });
  const [responses, setResponses] = React.useState<ConversationLine[]>(() => {
    const nextNodes = log.at(-1)!.line.next;

    if (!nextNodes) return [];

    const [actor] = nextNodes[0].split(".");

    return actor === "player"
      ? nextNodes.map(
          (node) => conversation.Actors[actor].lines[node.split(".")[1]]
        )
      : [];
  });
  const canClose = !log.at(-1)!.line.next;

  React.useEffect(() => {
    if (canClose) {
      onEnd(flags);
    }
  }, [flags, canClose]);

  // eslint-disable-next-line no-shadow
  const loadNextNode = (log: Log) => {
    const nextNodes = log.at(-1)!.line.next;
    if (nextNodes === undefined) {
      setLog(log);
      return;
    }

    const [actor, lineId] = nextNodes[0].split(".");
    const line = conversation.Actors[actor].lines[lineId];
    setLog([...log, { line, actor }]);
    if (line.set) {
      setFlags((prevFlags) => ({
        ...prevFlags,
        ...line.set,
      }));
    }

    if (line.next) {
      const [nextActor] = line.next[0].split(".");
      if (nextActor === "player") {
        setResponses(
          line.next.map(
            (node) => conversation.Actors[nextActor].lines[node.split(".")[1]]
          )
        );
      }
    }

    if (scrollableRef.current) {
      setTimeout(() => {
        scrollableRef.current!.contentWrapperEl.scrollTop =
          scrollableRef.current!.contentWrapperEl.scrollHeight;
      }, 50);
    }
  };

  return (
    <Dialog
      {...dialogProps}
      onClose={canClose ? onClose : null}
      width={usesize(60)}
    >
      <Scrollbar
        className={clsx(styles.scrollable, {
          [styles.scrollableNoResponses]: canClose,
        })}
        ref={scrollableRef}
      >
        <div className={styles.log}>
          {log.map((l, lIndex) => (
            <React.Fragment key={lIndex}>
              {log[lIndex - 1]?.actor === l.actor ? (
                <div />
              ) : (
                <Text
                  color={l.actor === "player" ? "primary" : "default"}
                  component="b"
                >
                  {l.actor === "player"
                    ? "You"
                    : conversation.Actors[l.actor].name}
                </Text>
              )}
              <Text color={l.actor === "player" ? "text-2" : "default"}>
                {!!l.line.action && <b>[{l.line.action}] </b>}
                {l.line.text}
              </Text>
            </React.Fragment>
          ))}
        </div>
      </Scrollbar>

      {!!log.at(-1)?.line.next && (
        <Scrollbar className={styles.responses}>
          {responses.map((response, rIndex) => (
            <OptionButton
              key={rIndex}
              index={rIndex + 1}
              onClick={() => {
                setResponses([]);
                if (response.set) {
                  setFlags((prevFlags) => ({
                    ...prevFlags,
                    ...response.set,
                  }));
                }
                loadNextNode([...log, { actor: "player", line: response }]);
              }}
            >
              {!!response.action && <b>[{response.action}] </b>}
              {response?.text}
            </OptionButton>
          ))}
          {log.at(-1)?.actor !== "player" &&
            !log.at(-1)!.line.next![0].startsWith("player") && (
              <OptionButton index={1} onClick={() => loadNextNode(log)}>
                <b>Continue</b>
              </OptionButton>
            )}
        </Scrollbar>
      )}
      {canClose && (
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
